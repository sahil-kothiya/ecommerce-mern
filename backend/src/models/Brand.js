import mongoose from "mongoose";
import slugify from "slugify";

const { Schema } = mongoose;

const brandSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Brand title is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    logo: {
      type: String,
      default: null,
    },
    banners: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  },
);

brandSchema.index({ slug: 1 });
brandSchema.index({ status: 1 });

brandSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "brand.id",
  match: { status: "active" },
});

brandSchema.pre("save", async function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });

        const existingBrand = await mongoose.models.Brand.findOne({
      slug: this.slug,
      _id: { $ne: this._id },
    });
    if (existingBrand) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  next();
});

export const Brand = mongoose.model("Brand", brandSchema);
