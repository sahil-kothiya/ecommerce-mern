import mongoose from "mongoose";
import Stripe from "stripe";
import { BaseService } from "../core/BaseService.js";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { calculateCartTotals } from "../utils/pricing.js";

const ORDER_STATUSES = ["new", "process", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["paid", "unpaid"];
const PAYMENT_METHODS = ["cod", "stripe", "paypal"];

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getPrimaryImagePath = (images = []) => {
  if (!Array.isArray(images) || !images.length) return null;
  const primary = images.find((image) => image?.isPrimary);
  return (
    primary?.path || primary?.url || images[0]?.path || images[0]?.url || null
  );
};

const isTransactionUnsupportedError = (err) => {
  if (err?.code === 20) return true;
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("transaction") &&
    (msg.includes("replica") || msg.includes("mongos"))
  );
};

export class OrderService extends BaseService {
  constructor() {
    super(Order);
  }

  async enrichOrderItemsWithImages(orders = []) {
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
  }

  async verifyStripePayment(paymentIntentId, userId, cartItems) {
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

    const totals = calculateCartTotals(cartItems);
    const paidAmountInCents = Number(
      intent.amount_received || intent.amount || 0,
    );
    const paidCurrency = String(intent.currency || "").toLowerCase();
    const intentUserId = String(intent.metadata?.userId || "");

    if (intentUserId !== String(userId)) {
      throw new AppError("Payment intent does not belong to this user", 403);
    }
    if (paidCurrency !== "usd") {
      throw new AppError("Invalid payment currency", 400);
    }
    if (paidAmountInCents !== totals.amountInCents) {
      throw new AppError(
        "Payment amount does not match current cart total. Please retry checkout.",
        409,
      );
    }

    const duplicatePaymentOrder = await Order.findOne({
      transactionId: paymentIntentId,
    }).lean();
    if (duplicatePaymentOrder) {
      throw new AppError("This payment intent has already been used", 409);
    }

    logger.info(`Stripe payment verified: ${paymentIntentId}`);
    return { status: "paid", transactionId: paymentIntentId };
  }

  async buildOrderFromCart(session, params) {
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
      idempotencyKey,
      notes,
      couponCode,
    } = params;

    const cartItems = session
      ? await Cart.find({ userId }).session(session).lean()
      : await Cart.find({ userId }).lean();

    if (!cartItems.length) throw new AppError("Cart is empty", 400);

    const productIds = [
      ...new Set(cartItems.map((item) => item.productId.toString())),
    ];
    const productQuery = Product.find({
      _id: { $in: productIds },
      status: "active",
    });
    const products = session
      ? await productQuery.session(session).lean()
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
          session ? { session, new: true } : { new: true },
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
          session ? { session, new: true } : { new: true },
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
      idempotencyKey: idempotencyKey || undefined,
      status: "new",
      couponCode: String(couponCode || "").trim() || undefined,
      notes: String(notes || "").trim() || undefined,
    });

    await order.save(session ? { session } : {});

    if (session) {
      await Cart.deleteMany({ userId }).session(session);
    } else {
      await Cart.deleteMany({ userId });
    }

    return order.toObject();
  }

  async createOrder(userId, orderData, idempotencyKey) {
    const { paymentMethod, paymentIntentId } = orderData;

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new AppError("Invalid payment method", 422);
    }

    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        userId,
        idempotencyKey,
      }).lean();
      if (existingOrder) {
        return { alreadyExists: true, order: existingOrder };
      }
    }

    const cartItems = await Cart.find({ userId }).lean();
    if (!cartItems.length) {
      throw new AppError("Cart is empty", 400);
    }

    let stripePaymentStatus = "unpaid";
    let stripeTransactionId = undefined;

    if (paymentMethod === "stripe") {
      if (!paymentIntentId) {
        throw new AppError("Stripe payment intent ID is required", 422);
      }
      const paymentResult = await this.verifyStripePayment(
        paymentIntentId,
        userId,
        cartItems,
      );
      stripePaymentStatus = paymentResult.status;
      stripeTransactionId = paymentResult.transactionId;
    }

    const requiredFields = {
      firstName: orderData.firstName,
      lastName: orderData.lastName,
      email: orderData.email,
      phone: orderData.phone,
      address1: orderData.address1,
      city: orderData.city,
      postCode: orderData.postCode,
      country: orderData.country,
    };
    const missingField = Object.entries(requiredFields).find(
      ([, value]) => !String(value || "").trim(),
    );
    if (missingField) {
      throw new AppError(`Missing required field: ${missingField[0]}`, 422);
    }

    const orderParams = {
      userId,
      ...orderData,
      stripePaymentStatus,
      stripeTransactionId,
      idempotencyKey,
    };

    const session = await mongoose.startSession();
    let createdOrder = null;

    try {
      await session.withTransaction(async () => {
        createdOrder = await this.buildOrderFromCart(session, orderParams);
      });
    } catch (txErr) {
      if (isTransactionUnsupportedError(txErr)) {
        logger.warn(
          "MongoDB transactions unavailable (standalone mode) — retrying without transaction",
        );
        createdOrder = await this.buildOrderFromCart(null, orderParams);
      } else {
        throw txErr;
      }
    } finally {
      await session.endSession();
    }

    return { alreadyExists: false, order: createdOrder };
  }

  buildSearchQuery(search = "") {
    const trimmed = String(search || "")
      .trim()
      .slice(0, 80);
    if (!trimmed) return null;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return {
      $or: [
        { orderNumber: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { firstName: { $regex: escaped, $options: "i" } },
        { lastName: { $regex: escaped, $options: "i" } },
      ],
    };
  }

  parseSort(sortInput = "-createdAt") {
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
  }

  async getUserOrders(userId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      search,
      sort = "-createdAt",
    } = filters;
    const skip = (page - 1) * limit;

    const query = { userId };
    if (ORDER_STATUSES.includes(status)) {
      query.status = status;
    }
    if (PAYMENT_STATUSES.includes(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }
    const searchQuery = this.buildSearchQuery(search);
    if (searchQuery) Object.assign(query, searchQuery);

    const sortObj = this.parseSort(sort);

    const [orders, total] = await Promise.all([
      Order.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ]);

    const enrichedOrders = await this.enrichOrderItemsWithImages(orders);

    return {
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
      },
    };
  }

  async getOrderById(orderId, userId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError("Invalid order ID", 400);
    }

    const order = await Order.findOne({ _id: orderId, userId }).lean();
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const [enrichedOrder] = await this.enrichOrderItemsWithImages([order]);
    return enrichedOrder;
  }

  async getUserReturnRequests(userId) {
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

    return {
      returnRequests,
      total: returnRequests.length,
    };
  }

  async reorderFromExisting(orderId, userId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError("Invalid order ID", 400);
    }

    const order = await Order.findOne({ _id: orderId, userId }).lean();
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    await Cart.deleteMany({ userId });

    const unavailableItems = [];
    for (const item of order.items || []) {
      const product = await Product.findOne({
        _id: item.productId,
        status: "active",
      }).lean();
      if (!product) {
        unavailableItems.push(item.title);
        continue;
      }

      let hasStock = false;
      if (item.variantId) {
        const variant = (product.variants || []).find(
          (v) => v._id.toString() === item.variantId.toString(),
        );
        hasStock =
          variant &&
          variant.status === "active" &&
          variant.stock >= item.quantity;
      } else {
        hasStock = !product.hasVariants && product.baseStock >= item.quantity;
      }

      if (!hasStock) {
        unavailableItems.push(item.title);
        continue;
      }

      await Cart.create({
        userId,
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
      });
    }

    const cart = await Cart.find({ userId }).populate("productId").lean();
    return {
      cart,
      unavailableItems,
      message:
        unavailableItems.length > 0
          ? `Some items are unavailable: ${unavailableItems.join(", ")}`
          : "All items added to cart",
    };
  }
}
