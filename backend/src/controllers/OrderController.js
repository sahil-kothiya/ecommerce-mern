import mongoose from "mongoose";
import { BaseController } from "../core/BaseController.js";
import { OrderService } from "../services/OrderService.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { AppError } from "../middleware/errorHandler.js";

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
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

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

export class OrderController extends BaseController {
  constructor() {
    super();
    this.orderService = new OrderService();
  }

  async store(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const idempotencyKey = String(req.headers["idempotency-key"] || "")
        .trim()
        .slice(0, 120);

      const result = await this.orderService.createOrder(
        userId,
        req.body,
        idempotencyKey,
      );

      if (result.alreadyExists) {
        return res.status(200).json({
          success: true,
          message: "Order already created for this idempotency key",
          data: result.order,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Order placed successfully",
        data: result.order,
      });
    } catch (error) {
      return next(
        error instanceof AppError
          ? error
          : new AppError(error.message || "Failed to create order", 500),
      );
    }
  }

  async index(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await this.orderService.getUserOrders(userId, {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        search: req.query.search,
        sort: req.query.sort,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(new AppError("Failed to fetch orders", 500));
    }
  }

  async show(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const order = await this.orderService.getOrderById(req.params.id, userId);

      return res.json({ success: true, data: order });
    } catch (error) {
      return next(
        error instanceof AppError
          ? error
          : new AppError("Failed to fetch order", 500),
      );
    }
  }

  async listReturns(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await this.orderService.getUserReturnRequests(userId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(new AppError("Failed to fetch returns", 500));
    }
  }

  async reorder(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await this.orderService.reorderFromExisting(
        req.params.id,
        userId,
      );

      return res.json({
        success: true,
        message: result.message,
        data: {
          addedItems: result.cart,
          skippedItems: result.unavailableItems.map((title) => ({
            reason: "Unavailable",
            title,
          })),
          cartItems: result.cart,
        },
      });
    } catch (error) {
      return next(
        error instanceof AppError
          ? error
          : new AppError("Failed to reorder items", 500),
      );
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

      const enrichedOrders =
        await this.orderService.enrichOrderItemsWithImages(orders);

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

      const [enrichedOrder] =
        await this.orderService.enrichOrderItemsWithImages([order]);

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
