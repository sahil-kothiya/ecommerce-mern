import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

const categorySchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Category title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        slug: {
            type: String,
            lowercase: true,
            trim: true,
        },
        summary: {
            type: String,
            maxlength: [500, 'Summary cannot exceed 500 characters'],
        },
        photo: {
            type: String,
            default: null,
        },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        level: {
            type: Number,
            default: 0,
        },
        path: {
            type: String,
            default: '',
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        hasChildren: {
            type: Boolean,
            default: false,
        },
        childrenCount: {
            type: Number,
            default: 0,
        },
        productsCount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isNavigationVisible: {
            type: Boolean,
            default: true,
        },
        seoTitle: {
            type: String,
            maxlength: [60, 'SEO title cannot exceed 60 characters'],
        },
        seoDescription: {
            type: String,
            maxlength: [160, 'SEO description cannot exceed 160 characters'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Optimized indexes for 10M+ products (compound indexes for covered queries)
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ status: 1, isFeatured: -1, sortOrder: 1 });
categorySchema.index({ parentId: 1, status: 1, sortOrder: 1 });
categorySchema.index({ level: 1, status: 1 });

// Partial index for navigation
categorySchema.index(
    { sortOrder: 1, parentId: 1 },
    {
        partialFilterExpression: { status: 'active', isNavigationVisible: true },
        name: 'idx_navigation_categories'
    }
);

// Virtual populate children
categorySchema.virtual('children', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentId',
    match: { status: 'active' },
});

// Virtual populate products
categorySchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'categoryId',
    match: { status: 'active' },
});

// Generate slug before saving
categorySchema.pre('save', async function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = slugify(this.title, { lower: true, strict: true });

        // Ensure unique slug
        const existingCategory = await mongoose.models.Category.findOne({ slug: this.slug });
        if (existingCategory) {
            this.slug = `${this.slug}-${Date.now()}`;
        }
    }
    next();
});

// Update parent's hasChildren when a child is added
categorySchema.post('save', async function () {
    if (this.parentId) {
        await mongoose.models.Category.findByIdAndUpdate(this.parentId, {
            hasChildren: true,
            $inc: { childrenCount: 1 },
        });
    }
});

// Static method to get next position for sorting
categorySchema.statics.getNextPosition = async function (parentId = null) {
    const lastCategory = await this.findOne(
        { parentId },
        {},
        { sort: { sortOrder: -1 } }
    );

    return lastCategory ? lastCategory.sortOrder + 1 : 0;
};

export const Category = mongoose.model('Category', categorySchema);
