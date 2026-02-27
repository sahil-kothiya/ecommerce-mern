import mongoose from "mongoose";

export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeString = (input) => {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").trim();
};

export const validatePasswordStrength = (password, options = {}) => {
  const {
    minLength = 6,
    requireNumber = true,
    requireLetter = true,
    requireSpecialChar = false,
  } = options;

  if (!password || password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long`,
    };
  }

  if (requireLetter && !/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one letter",
    };
  }

  if (requireNumber && !/\d/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { isValid: true, message: "Password is valid" };
};

export const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

export const isValidPrice = (price, options = {}) => {
  const { min = 0, max = Infinity } = options;
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice >= min && numPrice <= max;
};

export const isValidObjectIdArray = (ids) => {
  if (!Array.isArray(ids)) return false;
  return ids.every((id) => isValidObjectId(id));
};

export const isValidImageType = (mimeType) => {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return validTypes.includes(mimeType);
};

export const isValidFileSize = (size, maxSizeMB = 5) => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size <= maxBytes;
};

export const isValidSlug = (slug) => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

export const isValidHexColor = (color) => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

export const isValidJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

export const isValidCreditCard = (cardNumber) => {
  const sanitized = cardNumber.replace(/\s/g, "");
  if (!/^\d+$/.test(sanitized)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

export const isValidCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};
