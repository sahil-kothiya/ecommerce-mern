import { body, param } from "express-validator";

export const variantOptionIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Variant option ID is required")
    .isMongoId()
    .withMessage("Invalid variant option ID format"),
];

export const createVariantOptionValidator = [
  body("variantTypeId")
    .trim()
    .notEmpty()
    .withMessage("Variant type ID is required")
    .isMongoId()
    .withMessage("Invalid variant type ID format"),
  body("value")
    .trim()
    .notEmpty()
    .withMessage("Option value is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Value must be between 1 and 50 characters"),
  body("displayValue")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Display value cannot exceed 50 characters"),
  body("hexColor")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Invalid hex color format"),
];

export const updateVariantOptionValidator = [
  ...variantOptionIdValidator,
  body("variantTypeId")
    .optional()
    .isMongoId()
    .withMessage("Invalid variant type ID format"),
  body("value")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Value cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("Value must be between 1 and 50 characters"),
  body("displayValue")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Display value cannot exceed 50 characters"),
  body("hexColor")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Invalid hex color format"),
];
