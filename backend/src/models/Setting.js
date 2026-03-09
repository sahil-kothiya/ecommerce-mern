import mongoose from "mongoose";

const { Schema } = mongoose;

const settingSchema = new Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
      index: true,
    },
    siteName: { type: String, default: "Enterprise E-Commerce" },
    siteTagline: { type: String, default: "" },
    siteUrl: { type: String, default: "" },
    logo: { type: String, default: null },
    favicon: { type: String, default: null },

    websiteEmail: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    address: { type: String, default: "" },

    currencyCode: { type: String, default: "USD" },
    currencySymbol: { type: String, default: "$" },
    timezone: { type: String, default: "UTC" },
    maintenanceMode: { type: Boolean, default: false },

    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },

    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    twitter: { type: String, default: "" },
    youtube: { type: String, default: "" },

    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: "" },
    smtpFrom: { type: String, default: "" },

    stripePublicKey: { type: String, default: "" },
    stripeEnabled: { type: Boolean, default: false },
    paypalClientId: { type: String, default: "" },

    imageSettings: {
      allowedInputFormats: {
        type: [String],
        default: [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "webp",
          "svg",
          "bmp",
          "tiff",
          "tif",
          "avif",
          "heic",
          "heif",
          "ico",
        ],
      },
      preferredOutputFormat: {
        type: String,
        enum: ["webp", "jpeg", "png", "avif"],
        default: "webp",
      },
      maxFileSizeBytes: {
        type: Number,
        default: 10485760,
      },
      autoConvertEnabled: {
        type: Boolean,
        default: true,
      },
      autoGenerateThumbnail: {
        type: Boolean,
        default: true,
      },
      thumbnailWidth: {
        type: Number,
        default: 300,
      },
      thumbnailHeight: {
        type: Number,
        default: 300,
      },
      sections: {
        product: {
          maxWidth: { type: Number, default: 1200 },
          maxHeight: { type: Number, default: 1200 },
          quality: { type: Number, default: 85, min: 1, max: 100 },
          maxCount: { type: Number, default: 50 },
          aspectRatio: { type: String, default: "1:1" },
        },
        category: {
          maxWidth: { type: Number, default: 800 },
          maxHeight: { type: Number, default: 800 },
          quality: { type: Number, default: 80, min: 1, max: 100 },
          maxCount: { type: Number, default: 1 },
          aspectRatio: { type: String, default: "1:1" },
        },
        banner: {
          maxWidth: { type: Number, default: 1920 },
          maxHeight: { type: Number, default: 600 },
          quality: { type: Number, default: 90, min: 1, max: 100 },
          maxCount: { type: Number, default: 5 },
          aspectRatio: { type: String, default: "16:3" },
        },
        avatar: {
          maxWidth: { type: Number, default: 400 },
          maxHeight: { type: Number, default: 400 },
          quality: { type: Number, default: 80, min: 1, max: 100 },
          maxCount: { type: Number, default: 1 },
          aspectRatio: { type: String, default: "1:1" },
        },
        brand: {
          maxWidth: { type: Number, default: 400 },
          maxHeight: { type: Number, default: 400 },
          quality: { type: Number, default: 90, min: 1, max: 100 },
          maxCount: { type: Number, default: 1 },
          aspectRatio: { type: String, default: "1:1" },
        },
        review: {
          maxWidth: { type: Number, default: 800 },
          maxHeight: { type: Number, default: 800 },
          quality: { type: Number, default: 75, min: 1, max: 100 },
          maxCount: { type: Number, default: 5 },
          aspectRatio: { type: String, default: "free" },
        },
        settings: {
          maxWidth: { type: Number, default: 512 },
          maxHeight: { type: Number, default: 512 },
          quality: { type: Number, default: 90, min: 1, max: 100 },
          maxCount: { type: Number, default: 2 },
          aspectRatio: { type: String, default: "1:1" },
        },
      },
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export const Setting = mongoose.model("Setting", settingSchema);
