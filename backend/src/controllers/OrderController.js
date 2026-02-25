import mongoose from "mongoose";
import Stripe from "stripe";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const ORDER_STATUSES = ["new", "process", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["paid", "unpaid"];

const parsePagination = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const parseSort = (sortInput = "-createdAt") => {
  const sortValue = String(sortInput || "-createdAt").trim();
  const descending = sortValue.startsWith("-");
  const field = descending ? sortValue.slice(1) : sortValue;
  const allowed = new Set([
    "createdAt",
    "totalAmount",
    "orderNumber",
    "status",
    "paymentStatus",
  ]);

  if (!allowed.has(field)) {
    return { createdAt: -1 };
  }

  return { [field]: descending ? -1 : 1 };
};

const buildSearchQuery = (search = "") => {
  const trimmed = String(search || "").trim();
  if (!trimmed) return null;

  return {
    $or: [
      { orderNumber: { $regex: trimmed, $options: "i" } },
      { email: { $regex: trimmed, $options: "i" } },
      { firstName: { $regex: trimmed, $options: "i" } },
      { lastName: { $regex: trimmed, $options: "i" } },
    ],
  };
};

const PAYMENT_METHODS = ["cod", "stripe", "paypal"];

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getPrimaryImagePath = (images = []) => {
  if (!Array.isArray(images) || !images.length) return null;
  const primary = images.find((image) => image?.isPrimary);
  return (
    primary?.path || primary?.url || images[0]?.path || images[0]?.url || null
  );
};

const enrichOrderItemsWithResolvedImages = async (orders = []) => {
  const normalizedOrders = Array.isArray(orders) ? orders : [orders];
  const productIds = [
    ...new Set(
      normalizedOrders
        .flatMap((order) => order?.items || [])
        .map((item) => item?.productId?.toString())
        .filter(Boolean),
    ),
  ];

  if (!productIds.length) return normalizedOrders;

  const products = await Product.find({ _id: { $in: productIds } })
    .select("_id images variants")
    .lean();
  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  return normalizedOrders.map((order) => ({
    ...order,
    items: (order.items || []).map((item) => {
      const product = productMap.get(item?.productId?.toString());
      if (!product) return item;

      const variant = item.variantId
        ? (product.variants || []).find(
            (entry) => entry._id.toString() === item.variantId.toString(),
          )
        : null;

      const resolvedImage =
        getPrimaryImagePath(variant?.images) ||
        getPrimaryImagePath(product.images) ||
        item.image ||
        null;

      return {
        ...item,
        image: resolvedImage || item.image,
      };
    }),
  }));
};

const resolveOrderItemPricing = (product, variantId = null) => {
  if (variantId) {
    const variant = (product.variants || []).find(
      (item) => item._id.toString() === variantId.toString(),
    );
    if (!product.hasVariants || !variant || variant.status !== "active") {
      return null;
    }

    return {
      price: round(variant.price * (1 - (variant.discount || 0) / 100)),
      stock: Number(variant.stock || 0),
      variantId: variant._id,
    };
  }

  if (product.hasVariants) {
    return null;
  }

  return {
    price: round(product.basePrice * (1 - (product.baseDiscount || 0) / 100)),
    stock: Number(product.baseStock || 0),
    variantId: null,
  };
};

// Returns true when the error means MongoDB is not in a replica set (transactions unsupported)
const isTransactionUnsupportedError = (err) => {
  if (err?.code === 20) return true;
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("transaction") &&
    (msg.includes("replica") || msg.includes("mongos"))
  );
};

const buildOrderFromCart = async (sess, params) => {
  const {
    userId,
    firstName,
    lastName,
    email,
    phone,
    address1,
    address2,
    city,
    state,
    postCode,
    country,
    paymentMethod,
    stripePaymentStatus,
    stripeTransactionId,
    notes,
    couponCode,
  } = params;

  const cartItems = sess
    ? await Cart.find({ userId }).session(sess).lean()
    : await Cart.find({ userId }).lean();

  if (!cartItems.length) throw new AppError("Cart is empty", 400);

  const productIds = [
    ...new Set(cartItems.map((item) => item.productId.toString())),
  ];
  const productQuery = Product.find({
    _id: { $in: productIds },
    status: "active",
  });
  const products = sess
    ? await productQuery.session(sess).lean()
    : await productQuery.lean();

  const productMap = new Map(
    products.map((item) => [item._id.toString(), item]),
  );

  const orderItems = [];
  let totalQuantity = 0;
  let subTotal = 0;

  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.productId.toString());
    if (!product)
      throw new AppError("One or more cart products are unavailable", 400);

    const quantity = Number(cartItem.quantity || 0);
    if (!quantity || quantity < 1)
      throw new AppError("Invalid cart quantity", 400);

    let itemTitle = product.title;
    let itemSku = product.baseSku;
    let itemPrice = round(
      product.basePrice * (1 - (product.baseDiscount || 0) / 100),
    );
    let itemImage = getPrimaryImagePath(product.images);
    let stockUpdated = null;

    if (cartItem.variantId) {
      const variant = (product.variants || []).find(
        (entry) => entry._id.toString() === cartItem.variantId.toString(),
      );
      if (!product.hasVariants || !variant || variant.status !== "active") {
        throw new AppError("One or more cart variants are unavailable", 400);
      }

      itemTitle = `${product.title} (${variant.displayName || variant.sku})`;
      itemSku = variant.sku;
      itemPrice = round(variant.price * (1 - (variant.discount || 0) / 100));
      itemImage = getPrimaryImagePath(variant.images) || itemImage;

      stockUpdated = await Product.findOneAndUpdate(
        {
          _id: product._id,
          status: "active",
          "variants._id": variant._id,
          "variants.stock": { $gte: quantity },
        },
        { $inc: { "variants.$.stock": -quantity, salesCount: quantity } },
        sess ? { session: sess, new: true } : { new: true },
      ).lean();
    } else {
      stockUpdated = await Product.findOneAndUpdate(
        {
          _id: product._id,
          status: "active",
          hasVariants: false,
          baseStock: { $gte: quantity },
        },
        { $inc: { baseStock: -quantity, salesCount: quantity } },
        sess ? { session: sess, new: true } : { new: true },
      ).lean();
    }

    if (!stockUpdated)
      throw new AppError(`Insufficient stock for ${product.title}`, 400);

    const amount = round(itemPrice * quantity);
    subTotal += amount;
    totalQuantity += quantity;

    orderItems.push({
      productId: product._id,
      variantId: cartItem.variantId || null,
      title: itemTitle,
      sku: itemSku || `SKU-${product._id.toString().slice(-8).toUpperCase()}`,
      price: itemPrice,
      quantity,
      amount,
      image: itemImage || undefined,
    });
  }

  subTotal = round(subTotal);
  const shippingCost = subTotal >= 100 ? 0 : 10;
  const couponDiscount = 0;
  const totalAmount = round(subTotal + shippingCost - couponDiscount);

  const order = new Order({
    userId,
    items: orderItems,
    subTotal,
    shippingCost,
    couponDiscount,
    totalAmount,
    quantity: totalQuantity,
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    address1: String(address1).trim(),
    address2: String(address2 || "").trim() || undefined,
    city: String(city).trim(),
    state: String(state || "").trim() || undefined,
    postCode: String(postCode).trim(),
    country: String(country).trim(),
    paymentMethod,
    paymentStatus: stripePaymentStatus,
    transactionId: stripeTransactionId,
    status: "new",
    couponCode: String(couponCode || "").trim() || undefined,
    notes: String(notes || "").trim() || undefined,
  });

  await order.save(sess ? { session: sess } : {});

  if (sess) {
    await Cart.deleteMany({ userId }).session(sess);
  } else {
    await Cart.deleteMany({ userId });
  }

  return order.toObject();
};

export class OrderController {
  async store(req, res, next) {
    const session = await mongoose.startSession();
    let createdOrder = null;

    try {
      const userId = req.user?._id || req.user?.id;
      const {
        firstName,
        lastName,
        email,
        phone,
        address1,
        address2,
        city,
        state,
        postCode,
        country,
        paymentMethod,
        notes,
        couponCode,
      } = req.body;

      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        throw new AppError("Invalid payment method", 422);
      }

      let stripePaymentStatus = "unpaid";
      let stripeTransactionId = undefined;

      if (paymentMethod === "stripe") {
        const { paymentIntentId } = req.body;
        if (!paymentIntentId) {
          throw new AppError("Stripe payment intent ID is required", 422);
        }
        const settings = await Setting.findOne({ key: "main" })
          .select("stripeSecretKey")
          .lean();
        if (!settings?.stripeSecretKey) {
          throw new AppError("Stripe is not configured", 503);
        }
        const stripe = new Stripe(settings.stripeSecretKey);
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== "succeeded") {
          throw new AppError(
            `Payment not completed. Status: ${intent.status}`,
            402,
          );
        }
        stripePaymentStatus = "paid";
        stripeTransactionId = paymentIntentId;
        logger.info(`Stripe payment verified: ${paymentIntentId}`);
      }

      const requiredFields = {
        firstName,
        lastName,
        email,
        phone,
        address1,
        city,
        postCode,
        country,
      };
      const missingField = Object.entries(requiredFields).find(
        ([, value]) => !String(value || "").trim(),
      );
      if (missingField) {
        throw new AppError(`Missing required field: ${missingField[0]}`, 422);
      }

      const orderParams = {
        userId,
        firstName,
        lastName,
        email,
        phone,
        address1,
        address2,
        city,
        state,
        postCode,
        country,
        paymentMethod,
        stripePaymentStatus,
        stripeTransactionId,
        notes,
        couponCode,
      };

      // Attempt within a transaction; fall back to non-transactional for standalone MongoDB
      try {
        await session.withTransaction(async () => {
          createdOrder = await buildOrderFromCart(session, orderParams);
        });
      } catch (txErr) {
        if (isTransactionUnsupportedError(txErr)) {
          logger.warn(
            "MongoDB transactions unavailable (standalone mode) — retrying without transaction",
          );
          createdOrder = await buildOrderFromCart(null, orderParams);
        } else {
          throw txErr;
        }
      }

      return res.status(201).json({
        success: true,
        message: "Order placed successfully",
        data: createdOrder,
      });
    } catch (error) {
      if (!(error instanceof AppError)) {
        logger.error("Unexpected order creation error:", {
          message: error.message,
          name: error.name,
          code: error.code,
          stack: error.stack,
        });
      }
      return next(
        error instanceof AppError
          ? error
          : new AppError(error.message || "Failed to create order", 500),
      );
    } finally {
      await session.endSession();
    }
  }

  async index(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const { page, limit, skip } = parsePagination(req.query, 10, 50);
      const sort = parseSort(req.query.sort);

      const query = { userId };
      if (ORDER_STATUSES.includes(req.query.status)) {
        query.status = req.query.status;
      }
      if (PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
        query.paymentStatus = req.query.paymentStatus;
      }
      const searchQuery = buildSearchQuery(req.query.search);
      if (searchQuery) Object.assign(query, searchQuery);

      const [orders, total] = await Promise.all([
        Order.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Order.countDocuments(query),
      ]);
      const enrichedOrders = await enrichOrderItemsWithResolvedImages(orders);

      return res.json({
        success: true,
        data: {
          orders: enrichedOrders,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasPrev: page > 1,
            hasNext: page * limit < total,
          },
        },
      });
    } catch (error) {
      return next(new AppError("Failed to fetch orders", 500));
    }
  }

  async show(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid order ID", 400));
      }

      const userId = req.user?._id || req.user?.id;
      const order = await Order.findOne({ _id: id, userId }).lean();

      if (!order) {
        return next(new AppError("Order not found", 404));
      }

      const [enrichedOrder] = await enrichOrderItemsWithResolvedImages([order]);
      return res.json({ success: true, data: enrichedOrder });
    } catch (error) {
      return next(new AppError("Failed to fetch order", 500));
    }
  }

  async listReturns(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const orders = await Order.find({
        userId,
        "returnRequests.0": { $exists: true },
      })
        .select("orderNumber status createdAt returnRequests")
        .sort({ createdAt: -1 })
        .lean();

      const returnRequests = orders.flatMap((order) =>
        (order.returnRequests || []).map((request) => ({
          ...request,
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          orderCreatedAt: order.createdAt,
        })),
      );

      return res.json({
        success: true,
        data: {
          returnRequests,
          total: returnRequests.length,
        },
      });
    } catch (error) {
      return next(new AppError("Failed to fetch returns", 500));
    }
  }

  async reorder(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid order ID", 400));
      }

      const order = await Order.findOne({ _id: id, userId }).lean();
      if (!order) {
        return next(new AppError("Order not found", 404));
      }

      const addedItems = [];
      const skippedItems = [];

      for (const item of order.items || []) {
        const product = await Product.findOne({
          _id: item.productId,
          status: "active",
        }).lean();

        if (!product) {
          skippedItems.push({
            productId: item.productId,
            reason: "Product unavailable",
          });
          continue;
        }

        const pricing = resolveOrderItemPricing(product, item.variantId);
        if (!pricing) {
          skippedItems.push({
            productId: item.productId,
            variantId: item.variantId,
            reason: "Variant unavailable",
          });
          continue;
        }

        if (pricing.stock < 1) {
          skippedItems.push({
            productId: item.productId,
            variantId: item.variantId,
            reason: "Out of stock",
          });
          continue;
        }

        const existing = await Cart.findOne({
          userId,
          productId: product._id,
          variantId: pricing.variantId,
        });

        const requestedQty = Math.max(1, Number(item.quantity || 1));
        const existingQty = existing?.quantity || 0;
        const maxAddable = Math.max(0, pricing.stock - existingQty);
        const quantityToAdd = Math.min(requestedQty, maxAddable);

        if (quantityToAdd < 1) {
          skippedItems.push({
            productId: item.productId,
            variantId: item.variantId,
            reason: "Stock limit reached in cart",
          });
          continue;
        }

        if (existing) {
          existing.quantity = existingQty + quantityToAdd;
          existing.price = pricing.price;
          existing.amount = round(existing.quantity * pricing.price);
          await existing.save();
        } else {
          await Cart.create({
            userId,
            productId: product._id,
            variantId: pricing.variantId,
            quantity: quantityToAdd,
            price: pricing.price,
            amount: round(quantityToAdd * pricing.price),
          });
        }

        addedItems.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: quantityToAdd,
        });
      }

      const cartItems = await Cart.find({ userId })
        .populate("productId")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        message:
          addedItems.length > 0
            ? "Items added to cart from order"
            : "No items were added from this order",
        data: {
          addedItems,
          skippedItems,
          cartItems,
        },
      });
    } catch (error) {
      return next(new AppError("Failed to reorder items", 500));
    }
  }

  async requestReturn(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const { id } = req.params;
      const { reason, notes, items } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid order ID", 400));
      }

      const order = await Order.findOne({ _id: id, userId });
      if (!order) {
        return next(new AppError("Order not found", 404));
      }

      if (order.status !== "delivered") {
        return next(
          new AppError(
            "Returns can only be requested for delivered orders",
            400,
          ),
        );
      }

      const requestedItems = (
        Array.isArray(items) && items.length > 0
          ? items
          : order.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: item.quantity,
            }))
      ).map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: Math.max(1, Number(item.quantity || 1)),
      }));

      for (const requestedItem of requestedItems) {
        const matched = order.items.find((item) => {
          const sameProduct =
            String(item.productId) === String(requestedItem.productId);
          const sameVariant =
            String(item.variantId || "") ===
            String(requestedItem.variantId || "");
          return sameProduct && sameVariant;
        });

        if (!matched) {
          return next(new AppError("Return item does not exist in order", 400));
        }

        if (requestedItem.quantity > matched.quantity) {
          return next(
            new AppError("Return quantity exceeds purchased quantity", 400),
          );
        }
      }

      const returnRequest = {
        reason: String(reason || "").trim(),
        notes: String(notes || "").trim() || undefined,
        items: requestedItems,
        status: "requested",
        requestedAt: new Date(),
      };

      order.returnRequests.push(returnRequest);
      await order.save();

      return res.status(201).json({
        success: true,
        message: "Return request submitted",
        data: order.returnRequests[order.returnRequests.length - 1],
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      return next(new AppError("Failed to request return", 500));
    }
  }

  async adminAll(req, res, next) {
    try {
      const { page, limit, skip } = parsePagination(req.query, 20, 200);
      const sort = parseSort(req.query.sort);

      const query = {};
      if (ORDER_STATUSES.includes(req.query.status)) {
        query.status = req.query.status;
      }
      if (PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
        query.paymentStatus = req.query.paymentStatus;
      }
      const searchQuery = buildSearchQuery(req.query.search);
      if (searchQuery) Object.assign(query, searchQuery);

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate("userId", "name email role status")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query),
      ]);

      const enrichedOrders = await enrichOrderItemsWithResolvedImages(orders);

      return res.json({
        success: true,
        data: {
          orders: enrichedOrders,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasPrev: page > 1,
            hasNext: page * limit < total,
          },
        },
      });
    } catch (error) {
      return next(new AppError("Failed to fetch admin orders", 500));
    }
  }

  async adminSummary(req, res, next) {
    try {
      const [summary] = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            paidOrders: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0],
              },
            },
            newOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "new"] }, 1, 0],
              },
            },
            processingOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "process"] }, 1, 0],
              },
            },
            deliveredOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
              },
            },
            cancelledOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },
          },
        },
      ]);

      return res.json({
        success: true,
        data: {
          totalOrders: summary?.totalOrders || 0,
          totalRevenue: summary?.totalRevenue || 0,
          paidOrders: summary?.paidOrders || 0,
          newOrders: summary?.newOrders || 0,
          processingOrders: summary?.processingOrders || 0,
          deliveredOrders: summary?.deliveredOrders || 0,
          cancelledOrders: summary?.cancelledOrders || 0,
        },
      });
    } catch (error) {
      return next(new AppError("Failed to fetch order summary", 500));
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, paymentStatus } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid order ID", 400));
      }

      if (status !== undefined && !ORDER_STATUSES.includes(status)) {
        return next(new AppError("Invalid order status", 422));
      }

      if (
        paymentStatus !== undefined &&
        !PAYMENT_STATUSES.includes(paymentStatus)
      ) {
        return next(new AppError("Invalid payment status", 422));
      }

      const update = {};
      if (status !== undefined) update.status = status;
      if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;

      const order = await Order.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      }).lean();

      if (!order) {
        return next(new AppError("Order not found", 404));
      }

      const [enrichedOrder] = await enrichOrderItemsWithResolvedImages([order]);

      return res.json({
        success: true,
        message: "Order updated successfully",
        data: enrichedOrder,
      });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      return next(new AppError("Failed to update order", 500));
    }
  }
}

export const orderController = new OrderController();
