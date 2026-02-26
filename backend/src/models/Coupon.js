import mongoose from "mongoose";

const { Schema } = mongoose;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Code must be at least 3 characters"],
      maxlength: [20, "Code cannot exceed 20 characters"],
    },
    type: {
      type: String,
      enum: ["fixed", "percent"],
      required: true,
    },
    value: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Value must be positive"],
    },
    minPurchase: {
      type: Number,
      min: 0,
      default: 0,
    },
    minOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
    },
    validFrom: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    validUntil: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
  },
  {
    timestamps: true,
  },
);

couponSchema.index({ status: 1 });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ validUntil: 1 });

couponSchema.pre("validate", function (next) {
  // Sync dual fields: prefer the one that was explicitly modified
  const minPurchaseModified = this.isModified("minPurchase");
  const minOrderModified = this.isModified("minOrderAmount");
  const normalizedMinPurchase = minPurchaseModified
    ? (this.minPurchase ?? 0)
    : minOrderModified
      ? (this.minOrderAmount ?? 0)
      : (this.minPurchase ?? this.minOrderAmount ?? 0);
  this.minPurchase = normalizedMinPurchase;
  this.minOrderAmount = normalizedMinPurchase;

  const usedCountModified = this.isModified("usedCount");
  const usageCountModified = this.isModified("usageCount");
  const normalizedUsedCount = usedCountModified
    ? (this.usedCount ?? 0)
    : usageCountModified
      ? (this.usageCount ?? 0)
      : (this.usedCount ?? this.usageCount ?? 0);
  this.usedCount = normalizedUsedCount;
  this.usageCount = normalizedUsedCount;

  const startModified = this.isModified("startDate");
  const validFromModified = this.isModified("validFrom");
  const normalizedStartDate = startModified
    ? (this.startDate ?? null)
    : validFromModified
      ? (this.validFrom ?? null)
      : (this.startDate ?? this.validFrom ?? null);
  this.startDate = normalizedStartDate;
  this.validFrom = normalizedStartDate;

  const expiryModified = this.isModified("expiryDate");
  const validUntilModified = this.isModified("validUntil");
  const normalizedExpiryDate = expiryModified
    ? (this.expiryDate ?? null)
    : validUntilModified
      ? (this.validUntil ?? null)
      : (this.expiryDate ?? this.validUntil ?? null);
  this.expiryDate = normalizedExpiryDate;
  this.validUntil = normalizedExpiryDate;

  if (this.type === "percent" && this.value > 100) {
    next(new Error("Percent discount cannot exceed 100%"));
  } else {
    next();
  }
});

couponSchema.methods.calculateDiscount = function (total) {
  const minPurchase = this.minPurchase ?? this.minOrderAmount ?? 0;
  if (total < minPurchase) {
    return 0;
  }

  let discount = 0;

  if (this.type === "fixed") {
    discount = this.value;
  } else if (this.type === "percent") {
    discount = (this.value / 100) * total;

    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  }

  return Math.min(discount, total);
};

couponSchema.methods.isValid = function () {
  if (this.status !== "active") return false;

  const now = new Date();

  const startDate = this.startDate ?? this.validFrom;
  const expiryDate = this.expiryDate ?? this.validUntil;
  const usedCount = this.usedCount ?? this.usageCount ?? 0;

  if (startDate && now < startDate) return false;

  if (expiryDate && now > expiryDate) return false;

  if (this.usageLimit && usedCount >= this.usageLimit) return false;

  return true;
};

export const Coupon =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
