import mongoose from "mongoose";

const { Schema } = mongoose;

const VariantOptionSchema = new Schema(
  {
    variantTypeId: {
      type: Schema.Types.ObjectId,
      ref: "VariantType",
      required: true,
    },
    value: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    displayValue: {
      type: String,
      required: true,
      trim: true,
    },
    hexColor: {
      type: String,
      validate: {
        validator: (v) => !v || /^#[0-9A-F]{6}$/i.test(v),
        message: "Invalid hex color format",
      },
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

VariantOptionSchema.index({ variantTypeId: 1, value: 1 }, { unique: true });
VariantOptionSchema.index({ variantTypeId: 1, status: 1 });

VariantOptionSchema.virtual("type", {
  ref: "VariantType",
  localField: "variantTypeId",
  foreignField: "_id",
  justOne: true,
});

VariantOptionSchema.statics.findByType = function (variantTypeId) {
  return this.find({ variantTypeId, status: "active" }).sort({ sortOrder: 1 });
};

export const VariantOption = mongoose.model(
  "VariantOption",
  VariantOptionSchema,
);
