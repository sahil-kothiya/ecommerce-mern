import { body, param, query } from "express-validator";

export const productReviewQueryValidator = [
  param("productId")
    .trim()
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),

  query("sort")
    .optional()
    .trim()
    .isIn(["recent", "oldest", "highest", "lowest", "helpful"])
    .withMessage("Sort must be recent, oldest, highest, lowest, or helpful"),
];

export const canReviewValidator = [
  param("productId")
    .trim()
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),
];

export const markHelpfulValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Review ID is required")
    .isMongoId()
    .withMessage("Invalid review ID"),
];

export const createReviewValidator = [
  body("productId")
    .trim()
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5")
    .toInt(),

  body("orderId")
    .trim()
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID"),

  body("title")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be between 10 and 1000 characters"),
];

export const reviewIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Review ID is required")
    .isMongoId()
    .withMessage("Invalid review ID"),
];

export const updateReviewValidator = [
  ...reviewIdValidator,

  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5")
    .toInt(),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("comment")
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be between 10 and 1000 characters"),

  body().custom((_, { req }) => {
    const hasAnyField =
      req.body.rating !== undefined ||
      req.body.title !== undefined ||
      req.body.comment !== undefined;

    if (!hasAnyField) {
      throw new Error("At least one review field is required to update");
    }

    return true;
  }),
];

export const reviewStatusValidator = [
  ...reviewIdValidator,

  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
];

export const reviewAdminQueryValidator = [
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

  query("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),

  query("rating")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5")
    .toInt(),

  query("productId")
    .optional({ values: "falsy" })
    .trim()
    .isMongoId()
    .withMessage("Invalid product ID"),

  query("search")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search cannot exceed 100 characters"),
];
