import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

const brandSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Brand title is required'],
            trim: true,
            unique: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        slug: {
            type: String,
            lowercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        logo: {
            type: String,
            default: null,
        },
        description: {
            type: String,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
brandSchema.index({ slug: 1 });
brandSchema.index({ status: 1 });

// Virtual populate products
brandSchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'brandId',
    match: { status: 'active' },
});

// Generate slug before saving
brandSchema.pre('save', async function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = slugify(this.title, { lower: true, strict: true });

        // Ensure unique slug
        const existingBrand = await mongoose.models.Brand.findOne({ slug: this.slug });
        if (existingBrand) {
            this.slug = `${this.slug}-${Date.now()}`;
        }
    }
    next();
});

export const Brand = mongoose.model('Brand', brandSchema);
