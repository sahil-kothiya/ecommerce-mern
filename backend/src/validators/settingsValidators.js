import { body } from "express-validator";

export const updateSettingsValidator = [
  body("siteName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Site name must be between 1 and 100 characters"),
  body("siteTagline")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Tagline cannot exceed 200 characters"),
  body("websiteEmail")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Invalid email address"),
  body("supportEmail")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Invalid support email address"),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone cannot exceed 20 characters"),
  body("currencyCode")
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency code must be 3 characters"),
  body("maintenanceMode")
    .optional()
    .isBoolean()
    .withMessage("Maintenance mode must be a boolean"),
  body("metaTitle")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Meta title cannot exceed 100 characters"),
  body("metaDescription")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Meta description cannot exceed 300 characters"),
];

export const testEmailValidator = [
  body("to")
    .trim()
    .notEmpty()
    .withMessage("Recipient email is required")
    .isEmail()
    .withMessage("Invalid email address"),
];
