import slugify from "slugify";
import mongoose from "mongoose";
import { config } from "../config/index.js";

/**
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export const round = (value, decimals = 2) =>
  Math.round((Number(value) || 0) * 10 ** decimals) / 10 ** decimals;

/**
 * @param {string} value
 * @returns {boolean}
 */
export const parseBoolean = (value) => {
  if (value === undefined || value === null || value === "") return false;
  return value === true || value === "true" || value === "1" || value === 1;
};

/**
 * @param {string|undefined} value
 * @param {string[]} allowed
 * @param {string} fallback
 * @returns {string}
 */
export const normalizeStatus = (
  value,
  allowed = ["active", "inactive"],
  fallback = "active",
) => {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

/**
 * @param {mongoose.Model} model
 * @param {string} text
 * @param {string|null} excludeId
 * @param {string} field
 * @returns {Promise<string>}
 */
export const generateUniqueSlug = async (
  model,
  text,
  excludeId = null,
  field = "slug",
) => {
  const base = slugify(text, { lower: true, strict: true });
  let candidate = base;
  let counter = 1;

  while (true) {
    const query = { [field]: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await model.findOne(query).select("_id").lean();
    if (!existing) return candidate;
    candidate = `${base}-${counter++}`;
  }
};

/**
 * @param {string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

/**
 * @param {string} filePath
 * @returns {string}
 */
export const resolveImageUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith("http://") || filePath.startsWith("https://"))
    return filePath;
  const cleanPath = filePath.replace(/^\/+/, "");
  return `${config.apiUrl}/${cleanPath}`;
};

export const SHIPPING_CONFIG = {
  freeShippingThreshold: 100,
  standardShippingCost: 10,
};

/**
 * @param {number} subtotal
 * @returns {number}
 */
export const calculateShipping = (subtotal) =>
  subtotal >= SHIPPING_CONFIG.freeShippingThreshold
    ? 0
    : SHIPPING_CONFIG.standardShippingCost;
