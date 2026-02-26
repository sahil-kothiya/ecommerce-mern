import { body, param, query } from "express-validator";

export const couponQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("Limit must be between 1 and 200")
    .toInt(),

  query("search")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search cannot exceed 100 characters"),

  query("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive"])
    .withMessage('Status must be either "active" or "inactive"'),

  query("type")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["fixed", "percent"])
    .withMessage('Type must be either "fixed" or "percent"'),
];

export const couponIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Coupon ID is required")
    .isMongoId()
    .withMessage("Invalid coupon ID format"),
];

export const createCouponValidator = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters"),

  body("type")
    .trim()
    .notEmpty()
    .withMessage("Coupon type is required")
    .isIn(["fixed", "percent"])
    .withMessage('Coupon type must be either "fixed" or "percent"'),

  body("value")
    .notEmpty()
    .withMessage("Discount value is required")
    .isFloat({ gt: 0 })
    .withMessage("Value must be greater than 0"),

  body("minPurchase")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Minimum purchase cannot be negative")
    .toFloat(),

  body("minOrderAmount")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Minimum order amount cannot be negative")
    .toFloat(),

  body("maxDiscount")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Maximum discount cannot be negative")
    .toFloat(),

  body("usageLimit")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1")
    .toInt(),

  body("startDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("validFrom")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Valid from must be a valid date")
    .toDate(),

  body("expiryDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Expiry date must be a valid date")
    .toDate(),

  body("validUntil")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Valid until must be a valid date")
    .toDate(),

  body("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive"])
    .withMessage('Status must be either "active" or "inactive"'),

  body("description")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),

  body().custom((_, { req }) => {
    const type = String(req.body.type || "")
      .trim()
      .toLowerCase();
    const value = Number(req.body.value);

    if (type === "percent" && Number.isFinite(value) && value > 100) {
      throw new Error("Percent discount cannot exceed 100");
    }

    return true;
  }),
];

export const updateCouponValidator = [
  ...couponIdValidator,

  body("code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Coupon code cannot be empty")
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters"),

  body("type")
    .optional()
    .trim()
    .isIn(["fixed", "percent"])
    .withMessage('Coupon type must be either "fixed" or "percent"'),

  body("value")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Value must be greater than 0")
    .toFloat(),

  body("minPurchase")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Minimum purchase cannot be negative")
    .toFloat(),

  body("minOrderAmount")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Minimum order amount cannot be negative")
    .toFloat(),

  body("maxDiscount")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Maximum discount cannot be negative")
    .toFloat(),

  body("usageLimit")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1")
    .toInt(),

  body("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive"])
    .withMessage('Status must be either "active" or "inactive"'),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),

  body("startDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("validFrom")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Valid from must be a valid date")
    .toDate(),

  body("expiryDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Expiry date must be a valid date")
    .toDate(),

  body("validUntil")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Valid until must be a valid date")
    .toDate(),

  body().custom((_, { req }) => {
    const type = String(req.body.type || "")
      .trim()
      .toLowerCase();
    const value = Number(req.body.value);

    if (type === "percent" && Number.isFinite(value) && value > 100) {
      throw new Error("Percent discount cannot exceed 100");
    }

    return true;
  }),
];

export const validateCouponCodeValidator = [
  body("code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Coupon code cannot be empty")
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters"),

  body("couponCode")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Coupon code cannot be empty")
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters"),

  body("total")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total must be a non-negative number")
    .toFloat(),

  body("orderAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Order amount must be a non-negative number")
    .toFloat(),

  body().custom((_, { req }) => {
    const code = String(req.body.code || req.body.couponCode || "").trim();

    if (!code) {
      throw new Error("Coupon code is required");
    }

    return true;
  }),
];
