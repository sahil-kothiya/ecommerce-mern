import mongoose from "mongoose";

const { Schema } = mongoose;

const DiscountSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed", "amount"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },

    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

DiscountSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });
DiscountSchema.index({ categories: 1 });
DiscountSchema.index({ products: 1 });
DiscountSchema.index({ type: 1, isActive: 1 });

DiscountSchema.pre("validate", function (next) {
  if (this.type === "amount") {
    this.type = "fixed";
  }

  if (
    !(this.startsAt instanceof Date) ||
    Number.isNaN(this.startsAt?.getTime?.())
  ) {
    return next(new Error("startsAt must be a valid date"));
  }

  if (
    !(this.endsAt instanceof Date) ||
    Number.isNaN(this.endsAt?.getTime?.())
  ) {
    return next(new Error("endsAt must be a valid date"));
  }

  if (this.startsAt >= this.endsAt) {
    return next(new Error("endsAt must be later than startsAt"));
  }

  const hasCategories =
    Array.isArray(this.categories) && this.categories.length > 0;
  const hasProducts = Array.isArray(this.products) && this.products.length > 0;
  if (!hasCategories && !hasProducts) {
    return next(new Error("Select at least one category or product"));
  }

  if (this.type === "percentage") {
    if (!Number.isInteger(this.value)) {
      return next(new Error("Percentage value must be an integer"));
    }

    if (this.value < 1 || this.value > 100) {
      return next(new Error("Percentage value must be between 1 and 100"));
    }
  }

  if (this.type === "fixed" && this.value <= 0) {
    return next(new Error("Fixed amount must be greater than 0"));
  }

  return next();
});

DiscountSchema.methods.isCurrentlyActive = function () {
  if (!this.isActive) return false;

  const now = new Date();
  return this.startsAt <= now && this.endsAt >= now;
};

DiscountSchema.methods.calculateDiscountedPrice = function (originalPrice) {
  if (!this.isCurrentlyActive()) return originalPrice;

  if (this.type === "percentage") {
    return originalPrice - (originalPrice * this.value) / 100;
  } else if (this.type === "fixed") {
    return Math.max(0, originalPrice - this.value);
  }

  return originalPrice;
};

DiscountSchema.statics.findActive = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).sort({ priority: -1 });
};

DiscountSchema.statics.findByProduct = function (productId) {
  const now = new Date();
  return this.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    products: productId,
  })
    .sort({ priority: -1 })
    .limit(1);
};

DiscountSchema.statics.findByCategory = function (categoryId) {
  const now = new Date();
  return this.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    categories: categoryId,
  })
    .sort({ priority: -1 })
    .limit(1);
};

export const Discount = mongoose.model("Discount", DiscountSchema);
