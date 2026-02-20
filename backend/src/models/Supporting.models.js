import mongoose from 'mongoose';

const { Schema } = mongoose;

const VariantTypeSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

VariantTypeSchema.index({ name: 1 }, { unique: true });
VariantTypeSchema.index({ status: 1, sortOrder: 1 });

VariantTypeSchema.virtual('options', {
    ref: 'VariantOption',
    localField: '_id',
    foreignField: 'variantTypeId',
    match: { status: 'active' }
});

export const VariantType = mongoose.model('VariantType', VariantTypeSchema);

const VariantOptionSchema = new Schema({
    variantTypeId: {
        type: Schema.Types.ObjectId,
        ref: 'VariantType',
        required: true
    },
    value: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    displayValue: {
        type: String,
        required: true,
        trim: true
    },
    hexColor: {
        type: String,
        validate: {
            validator: (v) => !v || /^#[0-9A-F]{6}$/i.test(v),
            message: 'Invalid hex color format'
        }
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

VariantOptionSchema.index({ variantTypeId: 1, value: 1 }, { unique: true });
VariantOptionSchema.index({ variantTypeId: 1, status: 1 });

VariantOptionSchema.virtual('type', {
    ref: 'VariantType',
    localField: 'variantTypeId',
    foreignField: '_id',
    justOne: true
});

VariantOptionSchema.statics.findByType = function (variantTypeId) {
    return this.find({ variantTypeId, status: 'active' })
        .sort({ sortOrder: 1 });
};

export const VariantOption = mongoose.model('VariantOption', VariantOptionSchema);

const CouponSchema = new Schema({
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['fixed', 'percent'],
        default: 'fixed'
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },

        minOrderAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    maxDiscount: {
        type: Number,
        min: 0
    },
    usageLimit: {
        type: Number,
        min: 1
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    perUserLimit: {
        type: Number,
        default: 1,
        min: 1
    },

        validFrom: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
    },

        applicableProducts: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    applicableCategories: [{
        type: Schema.Types.ObjectId,
        ref: 'Category'
    }],

        description: {
        type: String,
        trim: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
CouponSchema.index({ applicableProducts: 1 });
CouponSchema.index({ applicableCategories: 1 });

CouponSchema.methods.isValid = function () {
    const now = new Date();

    if (this.status !== 'active') return false;
    if (this.validFrom && this.validFrom > now) return false;
    if (this.validUntil && this.validUntil < now) return false;
    if (this.usageLimit && this.usageCount >= this.usageLimit) return false;

    return true;
};

CouponSchema.methods.canBeUsedBy = function (userId, userUsageCount = 0) {
    if (!this.isValid()) return false;
    if (userUsageCount >= this.perUserLimit) return false;
    return true;
};

CouponSchema.methods.calculateDiscount = function (orderAmount) {
    if (!this.isValid()) return 0;
    if (orderAmount < this.minOrderAmount) return 0;

    let discount = 0;

    if (this.type === 'fixed') {
        discount = this.value;
    } else if (this.type === 'percent') {
        discount = (orderAmount * this.value) / 100;
        if (this.maxDiscount && discount > this.maxDiscount) {
            discount = this.maxDiscount;
        }
    }

    return Math.min(discount, orderAmount);
};

CouponSchema.methods.incrementUsage = async function () {
    this.usageCount += 1;

        if (this.usageLimit && this.usageCount >= this.usageLimit) {
        this.status = 'expired';
    }

    return this.save();
};

CouponSchema.statics.findByCode = function (code) {
    return this.findOne({ code: code.toUpperCase() });
};

CouponSchema.statics.findActive = function () {
    const now = new Date();
    return this.find({
        status: 'active',
        validFrom: { $lte: now },
        $or: [
            { validUntil: { $gte: now } },
            { validUntil: null }
        ]
    });
};

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);

const DiscountSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed', 'amount'],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },

        startsAt: {
        type: Date,
        required: true
    },
    endsAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },

        categories: [{
        type: Schema.Types.ObjectId,
        ref: 'Category'
    }],
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],

        priority: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

DiscountSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });
DiscountSchema.index({ categories: 1 });
DiscountSchema.index({ products: 1 });
DiscountSchema.index({ type: 1, isActive: 1 });

DiscountSchema.pre('validate', function (next) {
    if (this.type === 'amount') {
        this.type = 'fixed';
    }

    if (!(this.startsAt instanceof Date) || Number.isNaN(this.startsAt?.getTime?.())) {
        return next(new Error('startsAt must be a valid date'));
    }

    if (!(this.endsAt instanceof Date) || Number.isNaN(this.endsAt?.getTime?.())) {
        return next(new Error('endsAt must be a valid date'));
    }

    if (this.startsAt >= this.endsAt) {
        return next(new Error('endsAt must be later than startsAt'));
    }

    const hasCategories = Array.isArray(this.categories) && this.categories.length > 0;
    const hasProducts = Array.isArray(this.products) && this.products.length > 0;
    if (!hasCategories && !hasProducts) {
        return next(new Error('Select at least one category or product'));
    }

    if (this.type === 'percentage') {
        if (!Number.isInteger(this.value)) {
            return next(new Error('Percentage value must be an integer'));
        }

        if (this.value < 1 || this.value > 100) {
            return next(new Error('Percentage value must be between 1 and 100'));
        }
    }

    if (this.type === 'fixed' && this.value <= 0) {
        return next(new Error('Fixed amount must be greater than 0'));
    }

    return next();
});

DiscountSchema.methods.isCurrentlyActive = function () {
    if (!this.isActive) return false;

    const now = new Date();
    return this.startsAt <= now && this.endsAt >= now;
};

DiscountSchema.methods.calculateDiscountedPrice = function (originalPrice) {
    if (!this.isCurrentlyActive()) return originalPrice;

    if (this.type === 'percentage') {
        return originalPrice - (originalPrice * this.value / 100);
    } else if (this.type === 'fixed') {
        return Math.max(0, originalPrice - this.value);
    }

    return originalPrice;
};

DiscountSchema.statics.findActive = function () {
    const now = new Date();
    return this.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now }
    }).sort({ priority: -1 });
};

DiscountSchema.statics.findByProduct = function (productId) {
    const now = new Date();
    return this.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        products: productId
    }).sort({ priority: -1 }).limit(1);
};

DiscountSchema.statics.findByCategory = function (categoryId) {
    const now = new Date();
    return this.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        categories: categoryId
    }).sort({ priority: -1 }).limit(1);
};

export const Discount = mongoose.model('Discount', DiscountSchema);

const ShippingSchema = new Schema({
    type: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    estimatedDays: {
        type: Number,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

ShippingSchema.index({ status: 1, sortOrder: 1 });

ShippingSchema.statics.findActive = function () {
    return this.find({ status: 'active' }).sort({ sortOrder: 1 });
};

export const Shipping = mongoose.model('Shipping', ShippingSchema);
