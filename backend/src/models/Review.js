import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    helpful: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index({ productId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ rating: 1 });

reviewSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

reviewSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

reviewSchema.post("save", async function () {
  await updateProductRating(this.productId);
});

reviewSchema.post(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await updateProductRating(this.productId);
  },
);

reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc?.productId) {
    await updateProductRating(doc.productId);
  }
});

async function updateProductRating(productId) {
  const stats = await mongoose.models.Review.aggregate([
    { $match: { productId, status: "active" } },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.models.Product.findByIdAndUpdate(productId, {
      $set: {
        "ratings.average": Math.round(stats[0].avgRating * 10) / 10,
        "ratings.count": stats[0].count,
      },
    });
  } else {
    await mongoose.models.Product.findByIdAndUpdate(productId, {
      $set: {
        "ratings.average": 0,
        "ratings.count": 0,
      },
    });
  }
}

export const Review = mongoose.model("Review", reviewSchema);
