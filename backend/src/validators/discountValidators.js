import { body, param, query } from "express-validator";

export const discountQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage("Limit must be between 1 and 500")
    .toInt(),
  query("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
];

export const discountIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Discount ID is required")
    .isMongoId()
    .withMessage("Invalid discount ID format"),
];

export const createDiscountValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Discount title is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Discount type is required")
    .isIn(["percentage", "fixed"])
    .withMessage("Type must be percentage or fixed"),
  body("value")
    .notEmpty()
    .withMessage("Discount value is required")
    .isFloat({ gt: 0 })
    .withMessage("Value must be greater than 0"),
  body("startDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),
  body("endDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate(),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
  body("categories")
    .optional()
    .isArray()
    .withMessage("Categories must be an array"),
  body("categories.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),
  body("products")
    .optional()
    .isArray()
    .withMessage("Products must be an array"),
  body("products.*").optional().isMongoId().withMessage("Invalid product ID"),
  body().custom((_, { req }) => {
    const { type, value } = req.body;
    if (type === "percentage" && Number(value) > 100) {
      throw new Error("Percentage discount cannot exceed 100");
    }
    return true;
  }),
];

export const updateDiscountValidator = [
  ...discountIdValidator,
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),
  body("type")
    .optional()
    .trim()
    .isIn(["percentage", "fixed"])
    .withMessage("Type must be percentage or fixed"),
  body("value")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Value must be greater than 0"),
  body("startDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),
  body("endDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate(),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
];
