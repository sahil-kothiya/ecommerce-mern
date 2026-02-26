import authService from "../services/authService";
import { logger } from "./logger.js";

const STORAGE_KEY_PREFIX = "recentlyViewedProducts";
const LEGACY_STORAGE_KEY = "recentlyViewedProducts";
const MAX_RECENT_PRODUCTS = 20;

const getViewerScope = () => {
  try {
    const user = authService.getUser();
    const userId = typeof user?._id === "string" ? user._id.trim() : "";
    if (userId) {
      const role = typeof user?.role === "string" ? user.role.trim() : "user";
      return `${role}:${userId}`;
    }
  } catch (error) {
    logger.warn("Unable to resolve auth user for recently viewed scope", {
      error: error.message,
    });
  }

  return "guest";
};

const getStorageKey = () => `${STORAGE_KEY_PREFIX}:${getViewerScope()}`;

/**
 * Add product to recently viewed list
 * @param {Object} product - Product object with at least _id and basic info
 */
export const addRecentlyViewed = (product) => {
  try {
    if (!product?._id) {
      logger.warn("Cannot add product without _id to recently viewed");
      return;
    }

    const recent = getRecentlyViewed();
    const filtered = recent.filter((p) => p._id !== product._id);

    const productData = {
      _id: product._id,
      title: product.title || product.name,
      slug: product.slug,
      images: product.images || [],
      price: product.price,
      salePrice: product.salePrice,
      hasVariants: product.hasVariants,
      variants: product.variants || [],
      brand: product.brand,
      category: product.category,
      rating: product.rating,
      reviewCount: product.reviewCount,
      status: product.status,
      timestamp: Date.now(),
    };

    const updated = [productData, ...filtered].slice(0, MAX_RECENT_PRODUCTS);

    localStorage.setItem(getStorageKey(), JSON.stringify(updated));
    logger.info("Added product to recently viewed", {
      productId: product._id,
      total: updated.length,
      scope: getViewerScope(),
    });
  } catch (error) {
    logger.error("Failed to add recently viewed product", {
      error: error.message,
    });
  }
};

/**
 * Get recently viewed products
 * @param {number} limit - Maximum number of products to return
 * @returns {Array} Array of recently viewed products
 */
export const getRecentlyViewed = (limit = MAX_RECENT_PRODUCTS) => {
  try {
    const storageKey = getStorageKey();
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    const valid = Array.isArray(parsed) ? parsed : [];

    return valid.slice(0, limit).filter((p) => p?._id);
  } catch (error) {
    logger.error("Failed to get recently viewed products", {
      error: error.message,
    });
    return [];
  }
};

/**
 * Clear all recently viewed products
 */
export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(getStorageKey());
    logger.info("Cleared recently viewed products");
  } catch (error) {
    logger.error("Failed to clear recently viewed products", {
      error: error.message,
    });
  }
};

/**
 * Remove specific product from recently viewed
 * @param {string} productId - Product ID to remove
 */
export const removeRecentlyViewed = (productId) => {
  try {
    const recent = getRecentlyViewed();
    const filtered = recent.filter((p) => p._id !== productId);
    localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
    logger.info("Removed product from recently viewed", { productId });
  } catch (error) {
    logger.error("Failed to remove recently viewed product", {
      error: error.message,
    });
  }
};

export const clearLegacyRecentlyViewed = () => {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    logger.warn("Failed to clear legacy recently viewed key", {
      error: error.message,
    });
  }
};
