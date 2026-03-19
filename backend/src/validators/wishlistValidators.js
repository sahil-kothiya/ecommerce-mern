import { body, param } from "express-validator";

export const addToWishlistValidator = [
  body("productId")
    .trim()
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID format"),
];

export const wishlistItemIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Wishlist item ID is required")
    .isMongoId()
    .withMessage("Invalid wishlist item ID format"),
];
