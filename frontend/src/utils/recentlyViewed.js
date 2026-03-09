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
      // preserve all pricing fields getProductDisplayPricing relies on
      price: product.price,
      salePrice: product.salePrice,
      basePrice: product.basePrice,
      finalPrice: product.finalPrice,
      discount: product.discount,
      baseStock: product.baseStock,
      stock: product.stock,
      hasVariants: product.hasVariants,
      variants: product.variants || [],
      brand: product.brand,
      category: product.category,
      ratings: product.ratings,
      rating: product.rating,
      reviewCount: product.reviewCount,
      isFeatured: product.isFeatured,
      condition: product.condition,
      status: product.status,
      timestamp: Date.now(),
    };

    const updated = [productData, ...filtered].slice(0, MAX_RECENT_PRODUCTS);

    localStorage.setItem(getStorageKey(), JSON.stringify(updated));
  } catch (error) {
    logger.error("Failed to add recently viewed product", {
      error: error.message,
    });
  }
};

export const getRecentlyViewed = (limit = MAX_RECENT_PRODUCTS) => {
  try {
    const storageKey = getStorageKey();
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    const valid = Array.isArray(parsed) ? parsed : [];

    return valid.slice(0, limit).filter((p) => {
      if (!p?._id) return false;
      // Filter out stale entries with incomplete pricing (old cache format)
      if (p.hasVariants) {
        const variants = Array.isArray(p.variants) ? p.variants : [];
        return variants.some(
          (v) =>
            Number(v?.price) > 0 ||
            Number(v?.salePrice) > 0 ||
            Number(v?.finalPrice) > 0,
        );
      }
      return (
        Number(p.basePrice) > 0 ||
        Number(p.price) > 0 ||
        Number(p.finalPrice) > 0
      );
    });
  } catch (error) {
    logger.error("Failed to get recently viewed products", {
      error: error.message,
    });
    return [];
  }
};

export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(getStorageKey());
  } catch (error) {
    logger.error("Failed to clear recently viewed products", {
      error: error.message,
    });
  }
};

export const removeRecentlyViewed = (productId) => {
  try {
    const recent = getRecentlyViewed();
    const filtered = recent.filter((p) => p._id !== productId);
    localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
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
