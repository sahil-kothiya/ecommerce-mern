import { Setting } from "../models/Setting.js";
import { logger } from "./logger.js";

const DEFAULT_IMAGE_SETTINGS = Object.freeze({
  allowedInputFormats: [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "tiff",
    "tif",
    "avif",
    "heic",
    "heif",
    "ico",
  ],
  preferredOutputFormat: "webp",
  maxFileSizeBytes: 10485760,
  autoConvertEnabled: true,
  autoGenerateThumbnail: true,
  thumbnailWidth: 300,
  thumbnailHeight: 300,
  sections: {
    product: {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 85,
      maxCount: 50,
      aspectRatio: "1:1",
    },
    category: {
      maxWidth: 800,
      maxHeight: 800,
      quality: 80,
      maxCount: 1,
      aspectRatio: "1:1",
    },
    banner: {
      maxWidth: 1920,
      maxHeight: 600,
      quality: 90,
      maxCount: 5,
      aspectRatio: "16:3",
    },
    avatar: {
      maxWidth: 400,
      maxHeight: 400,
      quality: 80,
      maxCount: 1,
      aspectRatio: "1:1",
    },
    brand: {
      maxWidth: 400,
      maxHeight: 400,
      quality: 90,
      maxCount: 1,
      aspectRatio: "1:1",
    },
    review: {
      maxWidth: 800,
      maxHeight: 800,
      quality: 75,
      maxCount: 5,
      aspectRatio: "free",
    },
    settings: {
      maxWidth: 512,
      maxHeight: 512,
      quality: 90,
      maxCount: 2,
      aspectRatio: "1:1",
    },
  },
});

let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * @returns {Promise<Object>} image settings from DB or defaults
 */
export async function getImageSettings() {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const doc = await Setting.findOne({ key: "main" }).lean();
    if (doc?.imageSettings) {
      const merged = {
        ...DEFAULT_IMAGE_SETTINGS,
        ...doc.imageSettings,
        sections: {
          ...DEFAULT_IMAGE_SETTINGS.sections,
          ...(doc.imageSettings.sections || {}),
        },
      };
      for (const sectionKey of Object.keys(DEFAULT_IMAGE_SETTINGS.sections)) {
        merged.sections[sectionKey] = {
          ...DEFAULT_IMAGE_SETTINGS.sections[sectionKey],
          ...(merged.sections[sectionKey] || {}),
        };
      }
      cachedSettings = merged;
      cacheTimestamp = now;
      return merged;
    }
  } catch (error) {
    logger.error("Failed to load image settings from DB, using defaults", {
      error: error.message,
    });
  }

  cachedSettings = { ...DEFAULT_IMAGE_SETTINGS };
  cacheTimestamp = now;
  return cachedSettings;
}

/**
 * @param {string} [sectionName]
 * @returns {Promise<Object>} section-specific settings
 */
export async function getSectionSettings(sectionName) {
  const settings = await getImageSettings();
  return settings.sections[sectionName] || DEFAULT_IMAGE_SETTINGS.sections.product;
}

export function clearImageSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

export { DEFAULT_IMAGE_SETTINGS };
