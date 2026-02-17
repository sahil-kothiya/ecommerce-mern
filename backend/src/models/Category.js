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
        code: {
            type: String,
            trim: true,
            uppercase: true,
            minlength: [3, 'Code must be 3 characters'],
            maxlength: [3, 'Code must be 3 characters'],
        },
        codeLocked: {
            type: Boolean,
            default: false,
        },
        codeGeneratedAt: {
            type: Date,
            default: null,
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
        brandIds: {
            type: [Schema.Types.ObjectId],
            ref: 'Brand',
            default: [],
        },
        filterIds: {
            type: [Schema.Types.ObjectId],
            ref: 'Filter',
            default: [],
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
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
categorySchema.index({ code: 1 }, { unique: true, sparse: true });
categorySchema.index({ status: 1, isFeatured: -1, sortOrder: 1 });
categorySchema.index({ parentId: 1, status: 1, sortOrder: 1 });
categorySchema.index({ level: 1, status: 1 });
categorySchema.index({ brandIds: 1 });
categorySchema.index({ filterIds: 1 });

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

// Recalculate parent metadata safely after create/move/delete operations.
categorySchema.statics.syncChildrenMeta = async function (parentIds = []) {
    const normalizedParentIds = [
        ...new Set(
            parentIds
                .filter(Boolean)
                .map((id) => id.toString())
        ),
    ];

    if (normalizedParentIds.length === 0) {
        return;
    }

    await Promise.all(
        normalizedParentIds.map(async (parentId) => {
            const count = await this.countDocuments({ parentId });
            await this.updateOne(
                { _id: parentId },
                {
                    $set: {
                        childrenCount: count,
                        hasChildren: count > 0,
                    },
                }
            );
        })
    );
};

categorySchema.pre('save', async function (next) {
    this.$locals = this.$locals || {};
    this.$locals.wasNew = this.isNew;
    this.$locals.parentChanged = this.isModified('parentId');

    if (!this.isNew && this.$locals.parentChanged) {
        const previous = await this.constructor.findById(this._id).select('parentId').lean();
        this.$locals.previousParentId = previous?.parentId || null;
    }

    next();
});

categorySchema.post('save', async function () {
    const changedParent = Boolean(this.$locals?.parentChanged);
    const affectedParents = [];

    if (this.parentId && (this.$locals?.wasNew || changedParent)) {
        affectedParents.push(this.parentId);
    }

    if (changedParent && this.$locals?.previousParentId) {
        affectedParents.push(this.$locals.previousParentId);
    }

    if (affectedParents.length > 0) {
        await this.constructor.syncChildrenMeta(affectedParents);
    }
});

categorySchema.post('deleteOne', { document: true, query: false }, async function () {
    if (this.parentId) {
        await this.constructor.syncChildrenMeta([this.parentId]);
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
