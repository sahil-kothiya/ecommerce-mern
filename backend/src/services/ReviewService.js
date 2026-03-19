import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from '../utils/AppError.js';
import mongoose from "mongoose";
import { ReviewRepository } from '../repositories/index.js';

const SORT_OPTIONS = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
  helpful: { helpful: -1, createdAt: -1 },
};

export class ReviewService extends BaseService {
  constructor(repository = new ReviewRepository()) {
    super();
    this.repository = repository;
  }

  async listReviews({
    page = 1,
    limit = 20,
    status,
    productId,
    rating,
    search,
  } = {}) {
    const query = {};
    if (status) query.status = status;
    if (productId && mongoose.Types.ObjectId.isValid(productId))
      query.productId = productId;
    if (rating) query.rating = Number(rating);
    if (search) {
      query.$or = [
        {
          title: {
            $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
        {
          comment: {
            $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
      ];
    }
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.model
        .find(query)
        .populate("productId", "_id title slug status")
        .populate("userId", "_id name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.repository.model.countDocuments(query),
    ]);
    return {
      reviews,
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

  async getMyReviews(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.model
        .find({ userId })
        .populate("productId", "_id title slug status images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.repository.model.countDocuments({ userId }),
    ]);
    const normalized = reviews.map((r) => ({ ...r, product: r.productId }));
    return {
      reviews: normalized,
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

  async getProductReviewsPaginated(
    productId,
    { page = 1, limit = 10, sort = "recent" } = {},
  ) {
    if (!mongoose.Types.ObjectId.isValid(productId))
      throw new AppError("Invalid product ID", 400);
    const skip = (page - 1) * limit;
    const sortOrder = SORT_OPTIONS[sort] || SORT_OPTIONS.recent;
    const filter = { productId, status: "active" };
    const [reviews, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("userId", "_id name")
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.repository.model.countDocuments(filter),
    ]);
    const enriched = reviews.map((r) => ({
      ...r,
      verifiedPurchase: r.isVerifiedPurchase ?? true,
    }));
    return {
      reviews: enriched,
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

  async checkEligibility(userId, productId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(productId))
      throw new AppError("Invalid product ID", 400);
    if (userRole === "admin")
      return { canReview: false, reason: "Admins cannot submit reviews" };

    const existing = await this.repository.model.findOne({ productId, userId }).lean();
    if (existing)
      return {
        canReview: false,
        reason: "You have already reviewed this product",
        existingReviewId: existing._id,
      };

    const order = await Order.findOne({
      userId,
      status: "delivered",
      "items.productId": new mongoose.Types.ObjectId(productId),
    })
      .select("_id orderNumber")
      .lean();
    if (!order)
      return {
        canReview: false,
        reason: "You can only review products from your delivered orders",
      };

    return { canReview: true, eligibleOrderId: order._id };
  }

  async createReview(userId, reviewData) {
    const { productId, orderId, rating, title = "", comment } = reviewData;
    if (!mongoose.Types.ObjectId.isValid(productId))
      throw new AppError("Invalid product ID", 400);
    if (!mongoose.Types.ObjectId.isValid(orderId))
      throw new AppError("Invalid order ID", 400);

    const numRating = Number(rating);
    if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5)
      throw new AppError("Rating must be between 1 and 5", 400);
    if (!comment || String(comment).trim().length < 10)
      throw new AppError("Comment must be at least 10 characters", 400);

    const product = await Product.findById(productId).lean();
    if (!product || product.status !== "active")
      throw new AppError("Product not found or inactive", 404);

    const order = await Order.findOne({
      _id: orderId,
      userId,
      status: "delivered",
      "items.productId": new mongoose.Types.ObjectId(productId),
    })
      .select("_id")
      .lean();
    if (!order)
      throw new AppError(
        "Review can only be submitted from your delivered order for this product",
        403,
      );

    const existing = await this.repository.model.findOne({ productId, userId }).lean();
    if (existing)
      throw new AppError("You have already reviewed this product", 400);

    const review = await this.repository.model.create({
      productId,
      orderId,
      userId,
      rating: numRating,
      title: String(title).trim(),
      comment: String(comment).trim(),
      isVerifiedPurchase: true,
      status: "active",
    });

    return this.model
      .findById(review._id)
      .populate("productId", "_id title slug status")
      .populate("userId", "_id name email")
      .lean();
  }

  async updateReview(userId, reviewId, updateData) {
    if (!mongoose.Types.ObjectId.isValid(reviewId))
      throw new AppError("Invalid review ID", 400);
    const review = await this.repository.model.findById(reviewId);
    if (!review) throw new AppError("Review not found", 404);
    if (String(review.userId) !== String(userId))
      throw new AppError("You can only edit your own review", 403);

    const nextRating =
      updateData.rating !== undefined
        ? Number(updateData.rating)
        : review.rating;
    if (!Number.isFinite(nextRating) || nextRating < 1 || nextRating > 5)
      throw new AppError("Rating must be between 1 and 5", 400);

    const nextComment =
      updateData.comment !== undefined
        ? String(updateData.comment).trim()
        : review.comment;
    if (!nextComment || nextComment.length < 10)
      throw new AppError("Comment must be at least 10 characters", 400);

    review.rating = nextRating;
    if (updateData.title !== undefined)
      review.title = String(updateData.title || "").trim();
    review.comment = nextComment;
    await review.save();

    return this.model
      .findById(reviewId)
      .populate("productId", "_id title slug status")
      .populate("userId", "_id name email")
      .lean();
  }

  async deleteReview(userId, reviewId, isAdmin = false) {
    if (!mongoose.Types.ObjectId.isValid(reviewId))
      throw new AppError("Invalid review ID", 400);
    const review = await this.repository.model.findById(reviewId);
    if (!review) throw new AppError("Review not found", 404);
    if (!isAdmin && String(review.userId) !== String(userId))
      throw new AppError("Not authorized to delete this review", 403);
    await review.deleteOne();
  }

  async toggleHelpful(reviewId, userId, userRole) {
    if (!mongoose.Types.ObjectId.isValid(reviewId))
      throw new AppError("Invalid review ID", 400);
    if (userRole === "admin")
      throw new AppError("Admins cannot vote on reviews", 403);

    const review = await this.model
      .findById(reviewId)
      .select("userId helpfulVoters")
      .lean();
    if (!review) throw new AppError("Review not found", 404);
    if (String(review.userId) === String(userId))
      throw new AppError("You cannot mark your own review as helpful", 400);

    const alreadyVoted = review.helpfulVoters.some(
      (v) => String(v) === String(userId),
    );

    if (alreadyVoted) {
      await this.repository.model.updateOne(
        { _id: reviewId },
        { $pull: { helpfulVoters: userId }, $inc: { helpful: -1 } },
      );
      return {
        helpful: Math.max(0, (review.helpfulVoters.length || 1) - 1),
        voted: false,
        message: "Helpful vote removed",
      };
    }

    if (review.helpfulVoters.length >= 10000) {
      throw new AppError(
        "This review has reached the maximum number of helpful votes",
        400,
      );
    }

    await this.repository.model.updateOne(
      { _id: reviewId },
      { $addToSet: { helpfulVoters: userId }, $inc: { helpful: 1 } },
    );
    return {
      helpful: (review.helpfulVoters.length || 0) + 1,
      voted: true,
      message: "Review marked as helpful",
    };
  }

  async updateStatus(reviewId, status) {
    if (!mongoose.Types.ObjectId.isValid(reviewId))
      throw new AppError("Invalid review ID", 400);
    if (!["active", "inactive"].includes(status))
      throw new AppError("Status must be active or inactive", 400);

    const review = await this.repository.model.findById(reviewId);
    if (!review) throw new AppError("Review not found", 404);
    review.status = status;
    await review.save();

    return this.model
      .findById(reviewId)
      .populate("productId", "_id title slug status")
      .populate("userId", "_id name email")
      .lean();
  }

  async approveReview(reviewId) {
    return this.updateStatus(reviewId, "active");
  }

  async rejectReview(reviewId, reason = null) {
    return this.update(reviewId, {
      status: "inactive",
      ...(reason && { rejectionReason: reason }),
    });
  }
}
