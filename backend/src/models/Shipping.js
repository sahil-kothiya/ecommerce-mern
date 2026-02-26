import mongoose from "mongoose";

const { Schema } = mongoose;

const ShippingSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDays: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

ShippingSchema.index({ status: 1, sortOrder: 1 });

ShippingSchema.statics.findActive = function () {
  return this.find({ status: "active" }).sort({ sortOrder: 1 });
};

export const Shipping = mongoose.model("Shipping", ShippingSchema);
