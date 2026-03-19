import { body, param } from "express-validator";

export const addToCartValidator = [
  body("productId")
    .trim()
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID format"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage("Quantity must be between 1 and 99")
    .toInt(),
  body("variantId")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid variant ID format"),
];

export const updateCartItemValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Cart item ID is required")
    .isMongoId()
    .withMessage("Invalid cart item ID format"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1, max: 99 })
    .withMessage("Quantity must be between 1 and 99")
    .toInt(),
];

export const cartItemIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Cart item ID is required")
    .isMongoId()
    .withMessage("Invalid cart item ID format"),
];
