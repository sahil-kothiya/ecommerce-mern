import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const { Schema } = mongoose;

const orderItemSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        title: {
            type: String,
            required: true,
        },
        sku: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        image: {
            type: String,
        },
    },
    { _id: false }
);

const returnRequestItemSchema = new Schema(
    {
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
            min: 1,
        },
    },
    { _id: false }
);

const returnRequestSchema = new Schema(
    {
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: ['requested', 'approved', 'rejected', 'received', 'refunded'],
            default: 'requested',
        },
        items: {
            type: [returnRequestItemSchema],
            required: true,
            validate: {
                validator: (items) => Array.isArray(items) && items.length > 0,
                message: 'Return request must contain at least one item',
            },
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const orderSchema = new Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (items) => items.length > 0,
                message: 'Order must have at least one item',
            },
        },
        subTotal: {
            type: Number,
            required: true,
            min: 0,
        },
        shippingCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        couponDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

                firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: true,
        },
        address1: {
            type: String,
            required: true,
        },
        address2: {
            type: String,
        },
        city: {
            type: String,
            required: true,
        },
        state: {
            type: String,
        },
        postCode: {
            type: String,
            required: true,
        },
        country: {
            type: String,
            required: true,
        },

                paymentMethod: {
            type: String,
            enum: ['cod', 'stripe', 'paypal'],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ['paid', 'unpaid'],
            default: 'unpaid',
        },
        transactionId: {
            type: String,
        },

                status: {
            type: String,
            enum: ['new', 'process', 'delivered', 'cancelled'],
            default: 'new',
        },

                couponCode: {
            type: String,
        },
        notes: {
            type: String,
            maxlength: 500,
        },
        trackingNumber: {
            type: String,
        },
        returnRequests: {
            type: [returnRequestSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ email: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

orderSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true,
});

orderSchema.pre('save', function (next) {
    if (!this.orderNumber) {
        this.orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
    }
    next();
});

orderSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

orderSchema.virtual('fullAddress').get(function () {
    const parts = [
        this.address1,
        this.address2,
        this.city,
        this.state,
        this.postCode,
        this.country,
    ].filter(Boolean);
    return parts.join(', ');
});

export const Order = mongoose.model('Order', orderSchema);
