import mongoose from "mongoose";

const { Schema } = mongoose;

const VariantTypeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
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
  },
);

VariantTypeSchema.index({ name: 1 }, { unique: true });
VariantTypeSchema.index({ status: 1, sortOrder: 1 });

VariantTypeSchema.virtual("options", {
  ref: "VariantOption",
  localField: "_id",
  foreignField: "variantTypeId",
  match: { status: "active" },
});

export const VariantType = mongoose.model("VariantType", VariantTypeSchema);
