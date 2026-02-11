import mongoose from 'mongoose';

const { Schema } = mongoose;

const cartSchema = new Schema(
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
        variantId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
cartSchema.index({ userId: 1 });
cartSchema.index({ productId: 1 });
cartSchema.index({ userId: 1, productId: 1, variantId: 1 }, { unique: true });

// Virtual populate product
cartSchema.virtual('product', {
    ref: 'Product',
    localField: 'productId',
    foreignField: '_id',
    justOne: true,
});

// Calculate amount before saving
cartSchema.pre('save', function (next) {
    this.amount = this.price * this.quantity;
    next();
});

export const Cart = mongoose.model('Cart', cartSchema);
