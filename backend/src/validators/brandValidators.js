import { body, param } from "express-validator";

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

  // File fields (logo, banners) validated by multer middleware
];

export const updateBrandValidator = [
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
];

export const deleteBrandValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Brand ID is required")
    .isMongoId()
    .withMessage("Invalid brand ID format"),
];

export const getBrandValidator = [
  param("slug")
    .trim()
    .notEmpty()
    .withMessage("Brand slug or ID is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Invalid slug or ID format"),
];
