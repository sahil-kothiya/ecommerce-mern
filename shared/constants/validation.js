export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-()]{10,}$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  SEARCH_MIN_LENGTH: 2,
  SEARCH_MAX_LENGTH: 100,
  COUPON_CODE_MIN: 3,
  COUPON_CODE_MAX: 20,
  DESCRIPTION_MAX: 1000,
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
};

export const SUCCESS_MESSAGES = {
  PRODUCT_ADDED_TO_CART: "Product added to cart successfully!",
  PRODUCT_ADDED_TO_WISHLIST: "Product added to wishlist!",
  ORDER_PLACED: "Your order has been placed successfully!",
  PROFILE_UPDATED: "Your profile has been updated.",
};
