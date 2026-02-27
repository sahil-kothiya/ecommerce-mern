import { IMAGE_CONFIG } from "../constants/index.js";
import { getRandomItems } from "../utils/index.js";
import { logger } from "../utils/logger.js";

const AVAILABLE_PRODUCT_IMAGES = [
  "product_68e8d79a74aad_0.webp",
  "product_68e8d66387660_0.webp",
  "product_688a005542712_0.webp",
  "product_688a0088c4999_0.webp",
  "product_688a01254a8de_0.webp",
  "product_688a02ff4c13c_0.webp",
  "product_688a03fbc0e23_0.webp",
  "product_688aefd6b5d92_0.webp",
  "product_688b3bcfd79b9_0.webp",
  "product_688b3d8672a03_0.webp",
  "product_688b4fa2cea02_0.webp",
  "product_688b4fa2d7cae_1.webp",
  "product_688b5e59765d5_0.webp",
  "product_688b51b8ae4fd_0.webp",
  "product_688b603325c06_0.webp",
  "product_688c3b3d8cd70_0.webp",
  "product_688c9e130e22d_1.webp",
  "product_688c9e1305a57_0.webp",
  "product_688c51f279b9c_0.webp",
  "product_6889f81c6a225_4.webp",
  "product_6889f81c489d0_0.webp",
  "product_6889f81c616e8_3.webp",
  "product_6889f81c5163c_1.webp",
  "product_6889f81c59696_2.webp",
  "product_6889f980ae308_0.webp",
  "product_6889f9113eecd_0.webp",
  "product_6889fd3e6fc02_0.webp",
  "product_6889ff20a3003_0.webp",
  "product_6889ff20ab21f_1.webp",
  "product_6889ff20b31b8_2.webp",
  "product_68909d01452d4_0.webp",
  "product_68909d014e1e4_1.webp",
  "product_68909d015694f_2.webp",
  "product_68909d015f199_3.webp",
  "product_68909d0168d61_4.webp",
  "product_68909d0170766_5.webp",
  "product_68909d017985c_6.webp",
  "product_6892df81c7fe4_0.webp",
  "product_6892df81d0732_1.webp",
  "product_6892fe3b5293e_0.webp",
  "product_6892fe3b5ba1b_1.webp",
  "product_6892fea723299_0.webp",
  "product_6892fea72bb51_1.webp",
  "product_6892ffc4a0ae1_0.webp",
  "product_6892ffc4a8cea_1.webp",
  "product_6892ffc4afd6d_2.webp",
  "product_6893008bb8af3_0.webp",
  "product_6893008bc2ce2_1.webp",
  "product_6893008bcb95a_2.webp",
  "product_689300d5e7a6b_0.webp",
  "product_689300d5f0a7f_1.webp",
  "product_689300d604793_2.webp",
  "product_6893012f60da8_0.webp",
  "product_6893012f69029_1.webp",
  "product_6893012f70d3d_2.webp",
];

const AVAILABLE_VARIANT_IMAGES = [
  "variant_68e8c67d53c28_0.webp",
  "variant_68e8c73e05444_0.webp",
  "variant_68e8c429cdc68_0.webp",
  "variant_68e8c824a9cf7_0.webp",
  "variant_68e8ca99af65f_0.webp",
  "variant_68e8cdbf8f7b7_0.webp",
  "variant_68e8cf3d223f7_0.webp",
  "variant_68e8cfdb27714_0.webp",
  "variant_68e8d02251456_0.webp",
  "variant_68e8d04846afc_0.webp",
  "variant_68e8d2a66ff27_0.webp",
  "variant_68e8d10d7ef24_0.webp",
  "variant_68e8d53a7c3af_0.webp",
  "variant_68e8d3848c5eb_0.webp",
  "variant_68e8d467679cf_0.webp",
  "variant_68e8d46771062_1.webp",
  "variant_68e8d46779626_2.webp",
  "variant_68ec8d7cd47f3_1.webp",
  "variant_68ececa9e9fb8_0.webp",
  "variant_68ececa9f2ee2_1.webp",
  "variant_68ececaa1abba_1.webp",
  "variant_68ececaa4bcec_1.webp",
  "variant_68ececaa11db9_0.webp",
  "variant_68ececaa33d4d_0.webp",
  "variant_68ececaa2565a_2.webp",
  "variant_68ececaa42765_0.webp",
  "variant_68edfabeda8af_0.webp",
  "variant_6901f4c8a616e_1.webp",
  "variant_6901f4c8addeb_2.webp",
  "variant_6901f4c8863d6_2.webp",
  "variant_6901f4c85d109_0.webp",
  "variant_6901f4c864a76_1.webp",
  "variant_6901f4c86c824_2.webp",
  "variant_6901f4c876678_3.webp",
  "variant_6901f4c87e9c8_4.webp",
];

class ImageService {
  constructor() {
    this.cache = new Map();
    this.preloadedImages = new Set();
  }

  getProductImageUrl(filename, _thumbnail = false) {
    try {
      if (!filename || typeof filename !== "string") {
        return this.getDefaultProductImage();
      }

      const cleanFilename = this.sanitizeFilename(filename);

      if (cleanFilename.startsWith("http")) {
        return cleanFilename;
      }

      const imagePath = `${IMAGE_CONFIG.PRODUCT_PATH}/${cleanFilename}`;

      this.cache.set(filename, imagePath);

      return imagePath;
    } catch (error) {
      logger.warn("Product image URL generation error:", error);
      return this.getDefaultProductImage();
    }
  }

  getVariantImageUrl(filename, _thumbnail = false) {
    try {
      if (!filename || typeof filename !== "string") {
        return this.getDefaultVariantImage();
      }

      const cleanFilename = this.sanitizeFilename(filename);

      if (cleanFilename.startsWith("http")) {
        return cleanFilename;
      }

      const imagePath = `${IMAGE_CONFIG.VARIANT_PATH}/${cleanFilename}`;

      this.cache.set(filename, imagePath);

      return imagePath;
    } catch (error) {
      logger.warn("Variant image URL generation error:", error);
      return this.getDefaultVariantImage();
    }
  }

  getRandomProductImage() {
    const randomImages = getRandomItems(AVAILABLE_PRODUCT_IMAGES, 1);
    return this.getProductImageUrl(randomImages[0]);
  }

  getRandomVariantImage() {
    const randomImages = getRandomItems(AVAILABLE_VARIANT_IMAGES, 1);
    return this.getVariantImageUrl(randomImages[0]);
  }

  getRandomProductImages(count = 1) {
    try {
      const randomImages = getRandomItems(AVAILABLE_PRODUCT_IMAGES, count);
      return randomImages.map((filename) => this.getProductImageUrl(filename));
    } catch (error) {
      logger.warn("Random product images generation error:", error);
      return [this.getDefaultProductImage()];
    }
  }

  getRandomVariantImages(count = 1) {
    try {
      const randomImages = getRandomItems(AVAILABLE_VARIANT_IMAGES, count);
      return randomImages.map((filename) => this.getVariantImageUrl(filename));
    } catch (error) {
      logger.warn("Random variant images generation error:", error);
      return [this.getDefaultVariantImage()];
    }
  }

  getDefaultProductImage() {
    return this.getProductImageUrl(AVAILABLE_PRODUCT_IMAGES[0]);
  }

  getDefaultVariantImage() {
    return this.getVariantImageUrl(AVAILABLE_VARIANT_IMAGES[0]);
  }

  handleImageError(event, type = "product") {
    const img = event.target;

    if (!img || img.hasAttribute("data-fallback-used")) {
      return;
    }

    img.setAttribute("data-fallback-used", "true");

    try {
      const fallbackUrl =
        type === "variant"
          ? this.getDefaultVariantImage()
          : this.getDefaultProductImage();

      img.src = fallbackUrl;
    } catch (error) {
      logger.warn("Image error handling failed:", error);
    }
  }

  preloadImages(imageUrls) {
    if (!Array.isArray(imageUrls)) return;

    imageUrls.forEach((url) => {
      if (!this.preloadedImages.has(url)) {
        const img = new Image();
        img.onload = () => {
          this.preloadedImages.add(url);
        };
        img.onerror = () => {
          logger.warn(`Failed to preload image: ${url}`);
        };
        img.src = url;
      }
    });
  }

  isValidImageFormat(filename) {
    if (typeof filename !== "string") return false;

    const extension = filename.split(".").pop()?.toLowerCase();
    return IMAGE_CONFIG.SUPPORTED_FORMATS.includes(extension);
  }

  sanitizeFilename(filename) {
    if (typeof filename !== "string") return "";

    return filename
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/[<>:"|?*]/g, "") // Remove invalid characters
      .trim();
  }

  clearCache() {
    this.cache.clear();
    this.preloadedImages.clear();
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      preloadedCount: this.preloadedImages.size,
      availableProducts: AVAILABLE_PRODUCT_IMAGES.length,
      availableVariants: AVAILABLE_VARIANT_IMAGES.length,
    };
  }
}

const imageService = new ImageService();

// Export individual functions for backward compatibility
export const getProductImageUrl = (filename, thumbnail) =>
  imageService.getProductImageUrl(filename, thumbnail);

export const getVariantImageUrl = (filename, thumbnail) =>
  imageService.getVariantImageUrl(filename, thumbnail);

export const getRandomProductImage = () => imageService.getRandomProductImage();

export const getRandomVariantImage = () => imageService.getRandomVariantImage();

export const getRandomProductImages = (count) =>
  imageService.getRandomProductImages(count);

export const getRandomVariantImages = (count) =>
  imageService.getRandomVariantImages(count);

export const getDefaultProductImage = () =>
  imageService.getDefaultProductImage();

export const getDefaultVariantImage = () =>
  imageService.getDefaultVariantImage();

export const handleImageError = (event, type) =>
  imageService.handleImageError(event, type);

export const preloadImages = (imageUrls) =>
  imageService.preloadImages(imageUrls);

export default imageService;
