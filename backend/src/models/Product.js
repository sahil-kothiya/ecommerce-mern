import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

// ===========================
// Sub-schemas for embedding
// ===========================

const VariantOptionSchema = new Schema({
    typeId: {
        type: Schema.Types.ObjectId,
        ref: 'VariantType',
        required: true
    },
    typeName: {
        type: String,
        required: true,
        trim: true
    },
    typeDisplayName: {
        type: String,
        required: true
    },
    optionId: {
        type: Schema.Types.ObjectId,
        ref: 'VariantOption',
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
        required: true
    },
    hexColor: {
        type: String,
        validate: {
            validator: (v) => !v || /^#[0-9A-F]{6}$/i.test(v),
            message: 'Invalid hex color format'
        }
    }
}, { _id: false });

const ImageSchema = new Schema({
    path: {
        type: String,
        required: true,
        trim: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    altText: {
        type: String,
        trim: true,
        maxlength: 200
    }
}, { timestamps: true });

const ProductVariantSchema = new Schema({
    sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        set: (v) => Math.round(v * 100) / 100
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        set: (v) => Math.round(v * 100) / 100
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    options: [VariantOptionSchema],
    images: [ImageSchema],
    variantValues: {
        type: String,
        trim: true,
        lowercase: true
    }
}, { timestamps: true });

// Variant instance methods
ProductVariantSchema.methods.isInStock = function () {
    return this.stock > 0;
};

ProductVariantSchema.methods.hasLowStock = function (threshold = 10) {
    return this.stock > 0 && this.stock <= threshold;
};

ProductVariantSchema.methods.calculateFinalPrice = function () {
    if (this.discount > 0) {
        return this.price - (this.price * this.discount / 100);
    }
    return this.price;
};

// ===========================
// Main Product Schema
// ===========================

const productSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Product title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
        type: String,
        trim: true,
        lowercase: true
    },
    summary: {
        type: String,
        trim: true,
        maxlength: 500
    },
    description: {
        type: String,
        trim: true
    },
    condition: {
        type: String,
        enum: ['default', 'new', 'hot'],
        default: 'default'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'draft'],
        default: 'draft'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    hasVariants: {
        type: Boolean,
        default: false
    },

    // Base product fields
    basePrice: {
        type: Number,
        min: 0,
        set: (v) => v ? Math.round(v * 100) / 100 : null
    },
    baseDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        set: (v) => v ? Math.round(v * 100) / 100 : 0
    },
    baseStock: {
        type: Number,
        min: 0,
        default: 0
    },
    baseSku: {
        type: String,
        trim: true,
        uppercase: true
    },
    size: [String],

    // Embedded data
    variants: [ProductVariantSchema],
    images: [ImageSchema],

    // Denormalized category info
    category: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'Category'
        },
        title: String,
        slug: String,
        path: String
    },

    childCategory: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'Category'
        },
        title: String,
        slug: String
    },

    // Denormalized brand info
    brand: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'Brand'
        },
        title: String,
        slug: String
    },

    // Cached ratings
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        distribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 }
        }
    },

    // Active discount
    activeDiscount: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'Discount'
        },
        type: {
            type: String,
            enum: ['percentage', 'amount']
        },
        value: Number,
        endsAt: Date
    },

    // Search & tags
    searchTerms: String,
    tags: [String],

    // Metadata
    viewCount: {
        type: Number,
        default: 0,
        min: 0
    },
    salesCount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===========================
// Optimized Indexes for 10M+ products
// ===========================

// Primary lookup indexes (covered queries)
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ baseSku: 1 }, { unique: true, sparse: true });
productSchema.index({ 'variants.sku': 1 }, { sparse: true });

// Compound indexes for common queries (order matters for index efficiency)
productSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
productSchema.index({ status: 1, 'category.id': 1, basePrice: 1, createdAt: -1 });
productSchema.index({ status: 1, 'brand.id': 1, createdAt: -1 });
productSchema.index({ status: 1, condition: 1, createdAt: -1 });
productSchema.index({ status: 1, 'ratings.average': -1, salesCount: -1 });

// Text search index with weights for relevance
productSchema.index(
    {
        title: 'text',
        tags: 'text',
        'brand.title': 'text',
        summary: 'text'
    },
    {
        weights: {
            title: 10,
            tags: 5,
            'brand.title': 3,
            summary: 1
        },
        name: 'product_text_search'
    }
);

// Price range queries
productSchema.index({ status: 1, basePrice: 1, createdAt: -1 });

// Partial indexes for hot paths (reduce index size)
productSchema.index(
    { isFeatured: 1, 'ratings.average': -1, salesCount: -1 },
    {
        partialFilterExpression: { status: 'active', isFeatured: true },
        name: 'idx_featured_products'
    }
);

productSchema.index(
    { baseStock: 1 },
    {
        partialFilterExpression: { status: 'active', baseStock: { $lte: 10, $gt: 0 } },
        name: 'idx_low_stock'
    }
);

// Cursor-based pagination index
productSchema.index({ _id: 1, createdAt: -1 });

// ===========================
// Virtuals
// ===========================

productSchema.virtual('finalPrice').get(function () {
    if (this.hasVariants) return null;
    if (this.baseDiscount > 0) {
        return this.basePrice - (this.basePrice * this.baseDiscount / 100);
    }
    return this.basePrice;
});

productSchema.virtual('primaryImage').get(function () {
    if (this.images && this.images.length > 0) {
        const primary = this.images.find(img => img.isPrimary);
        return primary || this.images[0];
    }
    return null;
});

productSchema.virtual('inStock').get(function () {
    if (this.hasVariants) {
        return this.variants.some(v => v.stock > 0 && v.status === 'active');
    }
    return this.baseStock > 0;
});

// ===========================
// Pre-save Hooks
// ===========================

productSchema.pre('save', function (next) {
    if (!this.slug && this.title) {
        this.slug = slugify(this.title, { lower: true, strict: true });
    }

    // Generate searchTerms
    const terms = [
        this.title,
        this.summary,
        this.brand?.title,
        this.category?.title,
        ...(this.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();
    this.searchTerms = terms;

    // Validate variant logic
    if (this.hasVariants && this.variants.length === 0) {
        return next(new Error('Products with hasVariants=true must have variants'));
    }

    if (!this.hasVariants && !this.baseSku) {
        return next(new Error('Non-variant products must have baseSku'));
    }

    next();
});

// ===========================
// Instance Methods
// ===========================

productSchema.methods.isAvailable = function () {
    return this.status === 'active' && this.inStock;
};

productSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    return this.save({ timestamps: false });
};

productSchema.methods.incrementSalesCount = async function (quantity = 1) {
    this.salesCount += quantity;
    return this.save({ timestamps: false });
};

// For 10M products, use background jobs for rating updates
productSchema.methods.updateRatings = async function (ratingsData) {
    if (ratingsData) {
        this.ratings = ratingsData;
        return this.save({ timestamps: false, validateBeforeSave: false });
    }
    
    const Review = mongoose.model('Review');
    const count = await Review.countDocuments({ productId: this._id, status: 'active' });
    
    if (count === 0) {
        this.ratings = {
            average: 0,
            count: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
        return this.save({ timestamps: false, validateBeforeSave: false });
    }
    
    return this;
};

productSchema.methods.updateStock = async function (variantId, quantity) {
    if (this.hasVariants && variantId) {
        const variant = this.variants.id(variantId);
        if (!variant) throw new Error('Variant not found');
        if (variant.stock < quantity) throw new Error('Insufficient stock');
        variant.stock -= quantity;
    } else {
        if (this.baseStock < quantity) throw new Error('Insufficient stock');
        this.baseStock -= quantity;
    }
    return this.save();
};

productSchema.methods.getVariantBySku = function (sku) {
    return this.variants.find(v => v.sku === sku);
};

// ===========================
// Static Methods
// ===========================

productSchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug, status: 'active' });
};

productSchema.statics.findFeatured = function (limit = 10) {
    return this.find({ status: 'active', isFeatured: true })
        .sort({ createdAt: -1 })
        .limit(limit);
};

productSchema.statics.findByCategory = function (categoryId, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;
    const skip = (page - 1) * limit;

    return this.find({ 'category.id': categoryId, status: 'active' })
        .sort(sort)
        .skip(skip)
        .limit(limit);
};

// Optimized search with cursor-based pagination for 10M products
productSchema.statics.searchProducts = async function (query, filters = {}) {
    const {
        minPrice,
        maxPrice,
        categoryId,
        brandId,
        condition,
        sort = '-createdAt',
        page = 1,
        limit = 20,
        cursor // For cursor-based pagination
    } = filters;

    const matchQuery = {
        status: 'active',
        $text: { $search: query }
    };

    if (minPrice || maxPrice) {
        matchQuery.basePrice = {};
        if (minPrice) matchQuery.basePrice.$gte = Number(minPrice);
        if (maxPrice) matchQuery.basePrice.$lte = Number(maxPrice);
    }

    if (categoryId) matchQuery['category.id'] = categoryId;
    if (brandId) matchQuery['brand.id'] = brandId;
    if (condition) matchQuery.condition = condition;

    // Cursor-based pagination for better performance on large datasets
    if (cursor) {
        matchQuery._id = { $lt: cursor };
    }

    // Use lean() for 10x faster queries (returns plain objects, not Mongoose documents)
    const products = await this.find(matchQuery, {
        score: { $meta: 'textScore' },
        title: 1,
        slug: 1,
        basePrice: 1,
        baseDiscount: 1,
        images: { $slice: 1 }, // Only first image
        'ratings.average': 1,
        'ratings.count': 1,
        'category.title': 1,
        'brand.title': 1,
        condition: 1,
        isFeatured: 1
    })
        .sort({ score: { $meta: 'textScore' }, ...JSON.parse(`{"${sort}": -1}`) })
        .limit(limit + 1) // Fetch one extra to check if there are more
        .lean();

    const hasMore = products.length > limit;
    const results = hasMore ? products.slice(0, limit) : products;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    // For total count, use estimatedDocumentCount for better performance
    // Or cache the count in Redis
    return {
        products: results,
        hasMore,
        nextCursor,
        page,
        limit
    };
};

productSchema.statics.updateCategoryInfo = async function (categoryId, categoryData) {
    return this.updateMany(
        { 'category.id': categoryId },
        {
            $set: {
                'category.title': categoryData.title,
                'category.slug': categoryData.slug,
                'category.path': categoryData.pathNames
            }
        }
    );
};

productSchema.statics.updateBrandInfo = async function (brandId, brandData) {
    return this.updateMany(
        { 'brand.id': brandId },
        {
            $set: {
                'brand.title': brandData.title,
                'brand.slug': brandData.slug
            }
        }
    );
};

export const Product = mongoose.model('Product', productSchema);
