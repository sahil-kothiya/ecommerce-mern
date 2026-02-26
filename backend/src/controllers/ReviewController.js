import mongoose from "mongoose";
import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { AppError } from "../middleware/errorHandler.js";

export class ReviewController {
  async index(req, res, next) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.status) query.status = req.query.status;
      if (
        req.query.productId &&
        mongoose.Types.ObjectId.isValid(req.query.productId)
      ) {
        query.productId = req.query.productId;
      }
      if (req.query.rating) query.rating = Number(req.query.rating);
      if (req.query.search) {
        query.$or = [
          { title: { $regex: req.query.search, $options: "i" } },
          { comment: { $regex: req.query.search, $options: "i" } },
        ];
      }

      const [reviews, total] = await Promise.all([
        Review.find(query)
          .populate("productId", "_id title slug status")
          .populate("userId", "_id name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          reviews,
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
      next(new AppError("Failed to fetch reviews", 500));
    }
  }

  async getProductReviews(req, res, next) {
    try {
      const { productId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new AppError("Invalid product ID", 400));
      }

      const reviews = await Review.find({ productId, status: "active" })
        .populate("userId", "_id name")
        .sort({ createdAt: -1 })
        .lean();

      const reviewerIds = reviews
        .map((review) => {
          const userId =
            typeof review?.userId === "object"
              ? review.userId?._id
              : review?.userId;
          return userId ? String(userId) : null;
        })
        .filter(Boolean);

      let verifiedUserIdSet = new Set();
      if (reviewerIds.length > 0) {
        const verifiedOrders = await Order.find({
          userId: { $in: reviewerIds },
          status: "delivered",
          "items.productId": new mongoose.Types.ObjectId(productId),
        })
          .select("userId")
          .lean();

        verifiedUserIdSet = new Set(
          verifiedOrders
            .map((order) => (order?.userId ? String(order.userId) : null))
            .filter(Boolean),
        );
      }

      const enrichedReviews = reviews.map((review) => {
        const userId =
          typeof review?.userId === "object"
            ? review.userId?._id
            : review?.userId;
        const reviewerId = userId ? String(userId) : "";

        return {
          ...review,
          verifiedPurchase: verifiedUserIdSet.has(reviewerId),
        };
      });

      res.json({ success: true, data: enrichedReviews });
    } catch (error) {
      next(new AppError("Failed to fetch product reviews", 500));
    }
  }

  async create(req, res, next) {
    try {
      const { productId, orderId, rating, title = "", comment } = req.body;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new AppError("Invalid product ID", 400));
      }

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return next(new AppError("Invalid order ID", 400));
      }

      const numericRating = Number(rating);
      if (
        !Number.isFinite(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return next(new AppError("Rating must be between 1 and 5", 400));
      }

      if (!comment || String(comment).trim().length < 10) {
        return next(
          new AppError("Comment must be at least 10 characters", 400),
        );
      }

      const product = await Product.findById(productId).lean();
      if (!product || product.status !== "active") {
        return next(new AppError("Product not found or inactive", 404));
      }

      const eligibleOrder = await Order.findOne({
        _id: orderId,
        userId: req.user._id,
        status: "delivered",
        "items.productId": new mongoose.Types.ObjectId(productId),
      })
        .select("_id")
        .lean();

      if (!eligibleOrder) {
        return next(
          new AppError(
            "Review can only be submitted from your delivered order for this product",
            403,
          ),
        );
      }

      const existing = await Review.findOne({
        productId,
        userId: req.user._id,
      }).lean();
      if (existing) {
        return next(
          new AppError("You have already reviewed this product", 400),
        );
      }

      const review = await Review.create({
        productId,
        orderId,
        userId: req.user._id,
        rating: numericRating,
        title: String(title || "").trim(),
        comment: String(comment || "").trim(),
        status: "active",
      });

      const populated = await Review.findById(review._id)
        .populate("productId", "_id title slug status")
        .populate("userId", "_id name email");

      res.status(201).json({
        success: true,
        message: "Review created successfully",
        data: populated,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return next(
          new AppError("You have already reviewed this product", 400),
        );
      }
      next(new AppError("Failed to create review", 500));
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid review ID", 400));
      }

      const review = await Review.findById(id);
      if (!review) {
        return next(new AppError("Review not found", 404));
      }

      const isOwner = String(review.userId) === String(req.user._id);
      const isAdmin = req.user?.role === "admin";
      if (!isOwner && !isAdmin) {
        return next(new AppError("Not authorized to update this review", 403));
      }

      const nextRating =
        req.body.rating !== undefined ? Number(req.body.rating) : review.rating;
      if (!Number.isFinite(nextRating) || nextRating < 1 || nextRating > 5) {
        return next(new AppError("Rating must be between 1 and 5", 400));
      }

      const nextComment =
        req.body.comment !== undefined
          ? String(req.body.comment).trim()
          : review.comment;
      if (!nextComment || nextComment.length < 10) {
        return next(
          new AppError("Comment must be at least 10 characters", 400),
        );
      }

      review.rating = nextRating;
      if (req.body.title !== undefined)
        review.title = String(req.body.title || "").trim();
      review.comment = nextComment;
      await review.save();

      const updated = await Review.findById(id)
        .populate("productId", "_id title slug status")
        .populate("userId", "_id name email");

      res.json({
        success: true,
        message: "Review updated successfully",
        data: updated,
      });
    } catch (error) {
      next(new AppError("Failed to update review", 500));
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid review ID", 400));
      }

      const review = await Review.findById(id);
      if (!review) {
        return next(new AppError("Review not found", 404));
      }

      const isOwner = String(review.userId) === String(req.user._id);
      const isAdmin = req.user?.role === "admin";
      if (!isOwner && !isAdmin) {
        return next(new AppError("Not authorized to delete this review", 403));
      }

      await review.deleteOne();
      res.json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
      next(new AppError("Failed to delete review", 500));
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid review ID", 400));
      }

      if (!["active", "inactive"].includes(status)) {
        return next(new AppError("Status must be active or inactive", 400));
      }

      const review = await Review.findById(id);
      if (!review) {
        return next(new AppError("Review not found", 404));
      }

      review.status = status;
      await review.save();

      const updated = await Review.findById(id)
        .populate("productId", "_id title slug status")
        .populate("userId", "_id name email");

      res.json({
        success: true,
        message: "Review status updated successfully",
        data: updated,
      });
    } catch (error) {
      next(new AppError("Failed to update review status", 500));
    }
  }
}

export const reviewController = new ReviewController();
