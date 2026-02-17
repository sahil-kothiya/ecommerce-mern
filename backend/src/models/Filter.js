import mongoose from 'mongoose';

const { Schema } = mongoose;

const filterSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Filter name is required'],
            trim: true,
            lowercase: true,
            unique: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        title: {
            type: String,
            required: [true, 'Filter title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            default: null,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

filterSchema.index({ name: 1 }, { unique: true });
filterSchema.index({ status: 1 });

export const Filter = mongoose.model('Filter', filterSchema);
