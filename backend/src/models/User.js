import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    address1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    address2: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    postCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true },
);

const savedProductFilterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    filters: {
      search: { type: String, trim: true, maxlength: 120, default: "" },
      category: { type: String, trim: true, maxlength: 120, default: "all" },
      brand: { type: String, trim: true, maxlength: 120, default: "all" },
      minPrice: { type: String, trim: true, maxlength: 20, default: "" },
      maxPrice: { type: String, trim: true, maxlength: 20, default: "" },
      sort: { type: String, trim: true, maxlength: 40, default: "newest" },
    },
  },
  { _id: false, timestamps: false },
);

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters"],
      default: "",
    },
    password: {
      type: String,
      required: function () {
        return !this.provider;
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    photo: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    provider: {
      type: String,
      enum: ["local", "google", "facebook", "github"],
      default: "local",
    },
    providerId: {
      type: String,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    preferences: {
      productDiscovery: {
        savedFilters: {
          type: [savedProductFilterSchema],
          default: [],
        },
        recentSearches: {
          type: [String],
          default: [],
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ provider: 1, providerId: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
