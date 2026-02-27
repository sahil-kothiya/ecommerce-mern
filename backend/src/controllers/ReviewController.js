import mongoose from "mongoose";
import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { AppError } from "../middleware/errorHandler.js";

const SORT_OPTIONS = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
  helpful: { helpful: -1, createdAt: -1 },
};

export class ReviewController {
  async getMine(req, res, next) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find({ userId: req.user._id })
          .populate("productId", "_id title slug status images")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments({ userId: req.user._id }),
      ]);

      const normalizedReviews = reviews.map((review) => ({
        ...review,
        product: review.productId,
      }));

      res.json({
        success: true,
        data: {
          reviews: normalizedReviews,
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
    } catch {
      next(new AppError("Failed to fetch your reviews", 500));
    }
  }

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
    } catch {
      next(new AppError("Failed to fetch reviews", 500));
    }
  }

  async getProductReviews(req, res, next) {
    try {
      const { productId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new AppError("Invalid product ID", 400));
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const skip = (page - 1) * limit;
      const sortKey = req.query.sort || "recent";
      const sortOrder = SORT_OPTIONS[sortKey] || SORT_OPTIONS.recent;

      const filter = { productId, status: "active" };

      const [reviews, total] = await Promise.all([
        Review.find(filter)
          .populate("userId", "_id name")
          .sort(sortOrder)
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments(filter),
      ]);

      const enrichedReviews = reviews.map((review) => ({
        ...review,
        verifiedPurchase: review.isVerifiedPurchase ?? true,
      }));

      res.json({
        success: true,
        data: enrichedReviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasPrev: page > 1,
          hasNext: page * limit < total,
        },
      });
    } catch {
      next(new AppError("Failed to fetch product reviews", 500));
    }
  }

  async canReview(req, res, next) {
    try {
      const { productId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new AppError("Invalid product ID", 400));
      }

      if (req.user?.role === "admin") {
        return res.json({
          success: true,
          data: { canReview: false, reason: "Admins cannot submit reviews" },
        });
      }

      const existingReview = await Review.findOne({
        productId,
        userId: req.user._id,
      }).lean();

      if (existingReview) {
        return res.json({
          success: true,
          data: {
            canReview: false,
            reason: "You have already reviewed this product",
            existingReviewId: existingReview._id,
          },
        });
      }

      const eligibleOrder = await Order.findOne({
        userId: req.user._id,
        status: "delivered",
        "items.productId": new mongoose.Types.ObjectId(productId),
      })
        .select("_id orderNumber")
        .lean();

      if (!eligibleOrder) {
        return res.json({
          success: true,
          data: {
            canReview: false,
            reason: "You can only review products from your delivered orders",
          },
        });
      }

      res.json({
        success: true,
        data: {
          canReview: true,
          eligibleOrderId: eligibleOrder._id,
        },
      });
    } catch {
      next(new AppError("Failed to check review eligibility", 500));
    }
  }

  async create(req, res, next) {
    try {
      if (req.user?.role === "admin") {
        return next(new AppError("Admins cannot submit product reviews", 403));
      }

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
        isVerifiedPurchase: true,
        status: "active",
      });

      const populated = await Review.findById(review._id)
        .populate("productId", "_id title slug status")
        .populate("userId", "_id name email")
        .lean();

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
      if (!isOwner) {
        return next(new AppError("You can only edit your own review", 403));
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
        .populate("userId", "_id name email")
        .lean();

      res.json({
        success: true,
        message: "Review updated successfully",
        data: updated,
      });
    } catch {
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
    } catch {
      next(new AppError("Failed to delete review", 500));
    }
  }

  async markHelpful(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid review ID", 400));
      }

      if (req.user?.role === "admin") {
        return next(new AppError("Admins cannot vote on reviews", 403));
      }

      const review = await Review.findById(id);
      if (!review) {
        return next(new AppError("Review not found", 404));
      }

      if (String(review.userId) === String(req.user._id)) {
        return next(
          new AppError("You cannot mark your own review as helpful", 400),
        );
      }

      const alreadyVoted = review.helpfulVoters.some(
        (voterId) => String(voterId) === String(req.user._id),
      );

      if (alreadyVoted) {
        review.helpfulVoters = review.helpfulVoters.filter(
          (voterId) => String(voterId) !== String(req.user._id),
        );
        review.helpful = Math.max(0, review.helpful - 1);
        await review.save({ timestamps: false });
        return res.json({
          success: true,
          message: "Helpful vote removed",
          data: { helpful: review.helpful, voted: false },
        });
      }

      review.helpfulVoters.push(req.user._id);
      review.helpful += 1;
      await review.save({ timestamps: false });

      res.json({
        success: true,
        message: "Review marked as helpful",
        data: { helpful: review.helpful, voted: true },
      });
    } catch {
      next(new AppError("Failed to update helpful vote", 500));
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
        .populate("userId", "_id name email")
        .lean();

      res.json({
        success: true,
        message: "Review status updated successfully",
        data: updated,
      });
    } catch {
      next(new AppError("Failed to update review status", 500));
    }
  }
}

export const reviewController = new ReviewController();
