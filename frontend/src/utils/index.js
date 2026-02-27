import {
  CURRENCY_CONFIG,
  ERROR_MESSAGES,
  VALIDATION_RULES,
} from "../constants/index.js";
import { logger } from "./logger.js";

export const formatPrice = (
  price,
  currency = CURRENCY_CONFIG.DEFAULT,
  locale = CURRENCY_CONFIG.LOCALE,
) => {
  if (typeof price !== "number" || isNaN(price)) {
    return `${CURRENCY_CONFIG.SYMBOL}0.00`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: CURRENCY_CONFIG.DECIMAL_PLACES,
      maximumFractionDigits: CURRENCY_CONFIG.DECIMAL_PLACES,
    }).format(price);
  } catch (error) {
    logger.warn("Price formatting error:", error);
    return `${CURRENCY_CONFIG.SYMBOL}${price.toFixed(CURRENCY_CONFIG.DECIMAL_PLACES)}`;
  }
};

export const calculateDiscountPrice = (originalPrice, discountPercent) => {
  if (
    typeof originalPrice !== "number" ||
    typeof discountPercent !== "number"
  ) {
    return originalPrice || 0;
  }

  if (discountPercent <= 0 || discountPercent > 100) {
    return originalPrice;
  }

  return originalPrice * (1 - discountPercent / 100);
};

export const calculateSavings = (originalPrice, discountedPrice) => {
  if (
    typeof originalPrice !== "number" ||
    typeof discountedPrice !== "number"
  ) {
    return 0;
  }

  return Math.max(0, originalPrice - discountedPrice);
};

export const isValidEmail = (email) => {
  if (typeof email !== "string") return false;
  return VALIDATION_RULES.EMAIL.test(email.trim());
};

export const isValidPhone = (phone) => {
  if (typeof phone !== "string") return false;
  return VALIDATION_RULES.PHONE.test(phone.trim());
};

export const validatePassword = (password) => {
  if (typeof password !== "string") {
    return {
      isValid: false,
      strength: "invalid",
      message: "Password must be a string",
    };
  }

  const minLength = password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const criteria = [
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
  ];
  const metCriteria = criteria.filter(Boolean).length;

  let strength = "weak";
  let message = "";

  if (!minLength) {
    message = `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`;
  } else if (metCriteria < 3) {
    strength = "weak";
    message =
      "Password should include uppercase, lowercase, numbers, and special characters";
  } else if (metCriteria < 4) {
    strength = "medium";
    message = "Good password strength";
  } else {
    strength = "strong";
    message = "Strong password";
  }

  return {
    isValid: minLength && metCriteria >= 3,
    strength,
    message,
    criteria: {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
    },
  };
};

export const debounce = (func, wait = 300) => {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit = 100) => {
  let inThrottle;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

export const generateId = (prefix = "") => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2);
  return `${prefix}${timestamp}${random}`;
};

export const capitalizeWords = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const truncateText = (text, maxLength = 100) => {
  if (typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + "...";
};

export const createSlug = (str) => {
  if (typeof str !== "string") return "";

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

export const formatDate = (date, locale = "en-US") => {
  if (!date) return "";

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(dateObj);
  } catch (error) {
    logger.warn("Date formatting error:", error);
    return "";
  }
};

export const timeAgo = (date) => {
  if (!date) return "";

  try {
    const now = new Date();
    const dateObj = new Date(date);
    const diffInSeconds = Math.floor((now - dateObj) / 1000);

    const intervals = [
      { label: "year", seconds: 31536000 },
      { label: "month", seconds: 2592000 },
      { label: "week", seconds: 604800 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 },
    ];

    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
      }
    }

    return "Just now";
  } catch (error) {
    logger.warn("Time ago calculation error:", error);
    return "";
  }
};

export const isMobile = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

export const getRandomItems = (array, count = 1) => {
  if (!Array.isArray(array) || array.length === 0) return [];
  if (count >= array.length) return [...array];

  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const isEmpty = (obj) => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === "string") return obj.length === 0;
  if (typeof obj === "object") return Object.keys(obj).length === 0;
  return false;
};

export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn("Local storage set error:", error);
      return false;
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      logger.warn("Local storage get error:", error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.warn("Local storage remove error:", error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.warn("Local storage clear error:", error);
      return false;
    }
  },
};

export default {
  formatPrice,
  calculateDiscountPrice,
  calculateSavings,
  isValidEmail,
  isValidPhone,
  validatePassword,
  debounce,
  throttle,
  deepClone,
  generateId,
  capitalizeWords,
  truncateText,
  createSlug,
  formatDate,
  timeAgo,
  isMobile,
  scrollToTop,
  getRandomItems,
  isEmpty,
  storage,
};
