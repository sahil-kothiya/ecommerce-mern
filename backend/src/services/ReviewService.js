import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';

export class ReviewService extends BaseService {
    constructor() {
        super(Review);
    }

    async createReview(userId, reviewData) {
        const { productId, rating, comment, orderId } = reviewData;

        // Check if user has purchased this product
        if (orderId) {
            const order = await Order.findOne({
                _id: orderId,
                user: userId,
                status: 'delivered'
            }).lean();

            if (!order) {
                throw new AppError('Order not found or not delivered', 404);
            }

            const hasProduct = order.items.some(item => 
                item.product.toString() === productId
            );

            if (!hasProduct) {
                throw new AppError('Product not found in this order', 400);
            }
        }

        // Check if user already reviewed this product
        const existingReview = await this.model.findOne({
            userId,
            productId,
            status: { $ne: 'deleted' }
        }).lean();

        if (existingReview) {
            throw new AppError('You have already reviewed this product', 400);
        }

        // Create review
        const review = await this.create({
            userId,
            productId,
            rating,
            comment,
            orderId,
            status: 'pending'
        });

        return review;
    }

    async updateReview(userId, reviewId, updateData) {
        const review = await this.findByIdOrFail(reviewId);

        if (review.userId.toString() !== userId) {
            throw new AppError('You can only edit your own reviews', 403);
        }

        if (review.status === 'deleted') {
            throw new AppError('Cannot edit deleted review', 400);
        }

        const allowedUpdates = ['rating', 'comment'];
        const updates = {};
        
        allowedUpdates.forEach(field => {
            if (updateData[field] !== undefined) {
                updates[field] = updateData[field];
            }
        });

        return await this.update(reviewId, updates);
    }

    async deleteReview(userId, reviewId) {
        const review = await this.findByIdOrFail(reviewId);

        if (review.userId.toString() !== userId) {
            throw new AppError('You can only delete your own reviews', 403);
        }

        return await this.update(reviewId, { status: 'deleted' });
    }

    async approveReview(reviewId) {
        const review = await this.update(reviewId, { status: 'active' });
        
        // Update product ratings (in production, use background job)
        const product = await Product.findById(review.productId);
        if (product) {
            await product.updateRatings();
        }

        return review;
    }

    async rejectReview(reviewId, reason = null) {
        return await this.update(reviewId, { 
            status: 'rejected',
            ...(reason && { rejectionReason: reason })
        });
    }

    async getProductReviews(productId, options = {}) {
        return await this.findAll({
            ...options,
            filter: { 
                productId, 
                status: 'active',
                ...options.filter 
            },
            sort: { createdAt: -1 },
            populate: 'userId'
        });
    }

    async getUserReviews(userId, options = {}) {
        return await this.findAll({
            ...options,
            filter: { 
                userId,
                status: { $ne: 'deleted' },
                ...options.filter 
            },
            sort: { createdAt: -1 },
            populate: 'productId'
        });
    }

    async upvoteReview(reviewId, userId) {
        const review = await this.findByIdOrFail(reviewId);

        if (review.upvotedBy.includes(userId)) {
            throw new AppError('You have already upvoted this review', 400);
        }

        // Remove from downvotes if present
        const downvoteIndex = review.downvotedBy.indexOf(userId);
        if (downvoteIndex > -1) {
            review.downvotedBy.splice(downvoteIndex, 1);
        }

        review.upvotedBy.push(userId);
        await review.save();

        return review;
    }

    async downvoteReview(reviewId, userId) {
        const review = await this.findByIdOrFail(reviewId);

        if (review.downvotedBy.includes(userId)) {
            throw new AppError('You have already downvoted this review', 400);
        }

        // Remove from upvotes if present
        const upvoteIndex = review.upvotedBy.indexOf(userId);
        if (upvoteIndex > -1) {
            review.upvotedBy.splice(upvoteIndex, 1);
        }

        review.downvotedBy.push(userId);
        await review.save();

        return review;
    }
}
