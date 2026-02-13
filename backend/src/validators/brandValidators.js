import { body, param } from "express-validator";

// ============================================================================
// BRAND VALIDATION RULES
// ============================================================================
// Comprehensive validation for all brand API endpoints
// Follows dual validation pattern: client (React Hook Form) + server (Express Validator)

/**
 * Validation rules for creating a brand
 * POST /api/brands
 *
 * Required fields: title
 * Optional fields: description, status, logo (file), banners (files)
 */
export const createBrandValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Brand title is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-&.'()]+$/)
    .withMessage(
      "Title can only contain letters, numbers, spaces, and common punctuation",
    )
    .escape(), // Sanitize HTML entities

  body("description")
    .optional({ values: "falsy" }) // Allow empty strings
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters")
    .escape(), // Sanitize HTML entities

  body("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive"])
    .withMessage('Status must be either "active" or "inactive"'),

  // Logo is optional - file validation handled by multer middleware
  // Banners are optional - file validation handled by multer middleware
];

/**
 * Validation rules for updating a brand
 * PUT /api/brands/:id
 *
 * All fields optional (partial update supported)
 * Same validation rules as create when fields are provided
 */
export const updateBrandValidator = [
  // Validate route parameter
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Brand ID is required")
    .isMongoId()
    .withMessage("Invalid brand ID format"),

  body("title")
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage("Brand title cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-&.'()]+$/)
    .withMessage(
      "Title can only contain letters, numbers, spaces, and common punctuation",
    )
    .escape(),

  body("description")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters")
    .escape(),

  body("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive"])
    .withMessage('Status must be either "active" or "inactive"'),

  // Logo and banners - file validation handled by multer middleware
];

/**
 * Validation rules for deleting a brand
 * DELETE /api/brands/:id
 */
export const deleteBrandValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Brand ID is required")
    .isMongoId()
    .withMessage("Invalid brand ID format"),
];

/**
 * Validation rules for getting a brand by slug
 * GET /api/brands/:slug
 */
export const getBrandValidator = [
  param("slug")
    .trim()
    .notEmpty()
    .withMessage("Brand slug or ID is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Invalid slug or ID format"),
];
