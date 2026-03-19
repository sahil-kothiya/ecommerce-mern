import { body, param } from "express-validator";

export const variantTypeIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Variant type ID is required")
    .isMongoId()
    .withMessage("Invalid variant type ID format"),
];

export const createVariantTypeValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Variant type name is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Name must be between 1 and 50 characters"),
  body("displayName")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Display name cannot exceed 50 characters"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer")
    .toInt(),
];

export const updateVariantTypeValidator = [
  ...variantTypeIdValidator,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("Name must be between 1 and 50 characters"),
  body("displayName")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Display name cannot exceed 50 characters"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer")
    .toInt(),
];
