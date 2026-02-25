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

    smtpHost: { type: String, default: "sandbox.smtp.mailtrap.io" },
    smtpPort: { type: Number, default: 2525 },
    smtpUser: { type: String, default: "45418ec1cb45a5" },
    smtpPassword: { type: String, default: "c2787e1db12b54" },
    smtpFrom: { type: String, default: "" },

    stripePublicKey: { type: String, default: "" },
    stripeSecretKey: { type: String, default: "" },
    stripeWebhookSecret: { type: String, default: "" },
    stripeEnabled: { type: Boolean, default: false },
    paypalClientId: { type: String, default: "" },
    paypalClientSecret: { type: String, default: "" },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export const Setting = mongoose.model("Setting", settingSchema);
