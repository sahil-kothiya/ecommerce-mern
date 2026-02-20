import { Coupon } from '../models/Coupon.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';

export class CouponService extends BaseService {
    constructor() {
        super(Coupon);
    }

    async createCoupon(couponData) {
        const existing = await this.model.findOne({ code: couponData.code }).lean();
        
        if (existing) {
            throw new AppError('Coupon code already exists', 400);
        }

        if (couponData.validFrom && couponData.validUntil) {
            if (new Date(couponData.validFrom) >= new Date(couponData.validUntil)) {
                throw new AppError('Valid until date must be after valid from date', 400);
            }
        }

        return await this.create(couponData);
    }

    async validateCoupon(code, userId, orderAmount) {
        const coupon = await this.model.findOne({ 
            code: code.toUpperCase(),
            status: 'active'
        }).lean();

        if (!coupon) {
            throw new AppError('Invalid coupon code', 400);
        }

        const now = new Date();

                if (coupon.validFrom && new Date(coupon.validFrom) > now) {
            throw new AppError('Coupon is not yet valid', 400);
        }

        if (coupon.validUntil && new Date(coupon.validUntil) < now) {
            throw new AppError('Coupon has expired', 400);
        }

                if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            throw new AppError('Coupon usage limit reached', 400);
        }

        if (coupon.userUsageLimit && userId) {
            const userUsage = coupon.usedBy?.filter(
                u => u.toString() === userId.toString()
            ).length || 0;

            if (userUsage >= coupon.userUsageLimit) {
                throw new AppError('You have reached the usage limit for this coupon', 400);
            }
        }

                if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
            throw new AppError(
                `Minimum order amount of $${coupon.minOrderAmount} required`,
                400
            );
        }

        return coupon;
    }

    async applyCoupon(code, userId, orderAmount) {
        const coupon = await this.validateCoupon(code, userId, orderAmount);

        let discount = 0;

        if (coupon.discountType === 'percentage') {
            discount = (orderAmount * coupon.discountValue) / 100;
            
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else {
            discount = coupon.discountValue;
        }

        discount = Math.round(discount * 100) / 100;

        return {
            couponId: coupon._id,
            code: coupon.code,
            discount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
        };
    }

    async markCouponAsUsed(couponId, userId) {
        const coupon = await this.findByIdOrFail(couponId);

        coupon.usedCount += 1;
        
        if (userId && !coupon.usedBy.includes(userId)) {
            coupon.usedBy.push(userId);
        }

        await coupon.save();
        return coupon;
    }

    async getActiveCoupons(options = {}) {
        const now = new Date();
        
        return await this.findAll({
            ...options,
            filter: {
                status: 'active',
                $or: [
                    { validFrom: null, validUntil: null },
                    { validFrom: { $lte: now }, validUntil: { $gte: now } }
                ],
                ...options.filter
            }
        });
    }
}
