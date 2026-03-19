import { body, param } from "express-validator";

export const bannerIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Banner ID is required")
    .isMongoId()
    .withMessage("Invalid banner ID format"),
];

export const createBannerValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Banner title is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),
  body("link")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Link must be a valid URL"),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Status must be active, inactive, or scheduled"),
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
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer")
    .toInt(),
];

export const updateBannerValidator = [
  ...bannerIdValidator,
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Title must be between 2 and 100 characters"),
  body("link")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Link must be a valid URL"),
  body("status")
    .optional()
    .trim()
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Status must be active, inactive, or scheduled"),
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
];
