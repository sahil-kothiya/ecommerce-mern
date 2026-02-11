import mongoose from 'mongoose';

const { Schema } = mongoose;

const wishlistSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
wishlistSchema.index({ userId: 1 });
wishlistSchema.index({ productId: 1 });
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Virtual populate product
wishlistSchema.virtual('product', {
    ref: 'Product',
    localField: 'productId',
    foreignField: '_id',
    justOne: true,
});

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
