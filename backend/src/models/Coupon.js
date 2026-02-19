import mongoose from 'mongoose';

const { Schema } = mongoose;

const couponSchema = new Schema(
    {
        code: {
            type: String,
            required: [true, 'Coupon code is required'],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [3, 'Code must be at least 3 characters'],
            maxlength: [20, 'Code cannot exceed 20 characters'],
        },
        type: {
            type: String,
            enum: ['fixed', 'percent'],
            required: true,
        },
        value: {
            type: Number,
            required: [true, 'Discount value is required'],
            min: [0, 'Value must be positive'],
        },
        minPurchase: {
            type: Number,
            min: 0,
            default: 0,
        },
        maxDiscount: {
            type: Number,
            min: 0,
        },
        usageLimit: {
            type: Number,
            min: 1,
        },
        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        startDate: {
            type: Date,
        },
        expiryDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        description: {
            type: String,
            maxlength: [200, 'Description cannot exceed 200 characters'],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
couponSchema.index({ status: 1 });
couponSchema.index({ expiryDate: 1 });

// Validate percent value
couponSchema.pre('validate', function (next) {
    if (this.type === 'percent' && this.value > 100) {
        next(new Error('Percent discount cannot exceed 100%'));
    } else {
        next();
    }
});

// Calculate discount method
couponSchema.methods.calculateDiscount = function (total) {
    if (total < (this.minPurchase || 0)) {
        return 0;
    }

    let discount = 0;

    if (this.type === 'fixed') {
        discount = this.value;
    } else if (this.type === 'percent') {
        discount = (this.value / 100) * total;

        // Apply max discount if set
        if (this.maxDiscount && discount > this.maxDiscount) {
            discount = this.maxDiscount;
        }
    }

    // Ensure discount doesn't exceed total
    return Math.min(discount, total);
};

// Check if coupon is valid
couponSchema.methods.isValid = function () {
    if (this.status !== 'active') return false;

    const now = new Date();

    // Check start date
    if (this.startDate && now < this.startDate) return false;

    // Check expiry date
    if (this.expiryDate && now > this.expiryDate) return false;

    // Check usage limit
    if (this.usageLimit && this.usedCount >= this.usageLimit) return false;

    return true;
};

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
