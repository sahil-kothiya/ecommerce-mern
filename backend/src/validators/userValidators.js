import { body, param, query } from "express-validator";

export const userQueryValidator = [
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
  query("role")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["admin", "user"])
    .withMessage("Role must be admin or user"),
  query("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid status value"),
];

export const userIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),
];

export const createUserValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters"),
  body("role")
    .optional()
    .trim()
    .isIn(["admin", "user"])
    .withMessage("Role must be admin or user"),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid status value"),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone cannot exceed 20 characters"),
];

export const updateUserValidator = [
  ...userIdValidator,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("role")
    .optional()
    .trim()
    .isIn(["admin", "user"])
    .withMessage("Role must be admin or user"),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid status value"),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone cannot exceed 20 characters"),
];
