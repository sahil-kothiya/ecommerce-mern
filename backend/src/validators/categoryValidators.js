import { body, param, query } from "express-validator";

export const categoryQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
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
    .withMessage("Status must be active or inactive"),
];

export const categoryIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Invalid category ID format"),
];

export const createCategoryValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Category title is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),
  body("parentId")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid parent category ID"),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),
  body("isNavigationVisible")
    .optional()
    .isBoolean()
    .withMessage("isNavigationVisible must be a boolean"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer")
    .toInt(),
  body("seoTitle")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("SEO title cannot exceed 100 characters"),
  body("seoDescription")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("SEO description cannot exceed 300 characters"),
];

export const updateCategoryValidator = [
  ...categoryIdValidator,
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),
  body("parentId")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid parent category ID"),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),
  body("isNavigationVisible")
    .optional()
    .isBoolean()
    .withMessage("isNavigationVisible must be a boolean"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer")
    .toInt(),
];
