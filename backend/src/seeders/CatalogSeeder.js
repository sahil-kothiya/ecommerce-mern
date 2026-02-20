import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { Banner } from "../models/Banner.js";
import { Product } from "../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceImagesRoot = path.resolve(__dirname, "../../../images");

const DEFAULT_CONFIG = {
  clearExisting: true,
  categories: {
    enabled: true,
    count: 10,
    activeRatio: 0.8,
  },
  brands: {
    enabled: true,
    count: 10,
    activeRatio: 0.8,
  },
  banners: {
    enabled: true,
    count: 10,
    activeRatio: 0.7,
    scheduledRatio: 0.1,
  },
  products: {
    enabled: true,
    count: 10,
    activeRatio: 0.8,
    featuredRatio: 0.2,
  },
};

const CATEGORY_NAMES = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Beauty",
  "Sports",
  "Books",
  "Toys",
  "Groceries",
  "Office",
  "Automotive",
  "Health",
  "Pet Supplies",
];

const BRAND_NAMES = [
  "Apple",
  "Samsung",
  "Sony",
  "Nike",
  "Adidas",
  "Canon",
  "Dell",
  "HP",
  "IKEA",
  "Loreal",
  "Puma",
  "Lenovo",
];

const PRODUCT_TITLES = [
  "Premium Wireless Headphones",
  "Smart Fitness Watch",
  "Ergonomic Office Chair",
  "Hydrating Skin Serum",
  "Running Performance Shoes",
  "Compact Mirrorless Camera",
  "Ultra HD Monitor",
  "Mechanical Keyboard",
  "Minimalist Table Lamp",
  "Travel Utility Backpack",
  "Portable Blender",
  "Noise Cancelling Earbuds",
];

const toSlug = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export class CatalogSeeder {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.categoryImages = [];
    this.brandImages = [];
    this.bannerImages = [];
    this.productImages = [];
  }

  async run(options = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, options);

    logger.info("Starting catalog demo seeding...");
    logger.info(`Config: ${JSON.stringify(this.config)}`);

    await this.loadImagePools();

    if (this.config.clearExisting) {
      await this.clearExistingData();
    }

    const categories = this.config.categories.enabled
      ? await this.seedCategories()
      : await Category.find({}).sort({ createdAt: 1 }).lean();

    const brands = this.config.brands.enabled
      ? await this.seedBrands()
      : await Brand.find({}).sort({ createdAt: 1 }).lean();

    if (this.config.banners.enabled) {
      await this.seedBanners();
    }

    if (this.config.products.enabled) {
      await this.seedProducts(categories, brands);
    }

    logger.info("Catalog demo seeding completed");
  }

  mergeConfig(base, overrides) {
    return {
      ...base,
      ...overrides,
      categories: { ...base.categories, ...(overrides.categories || {}) },
      brands: { ...base.brands, ...(overrides.brands || {}) },
      banners: { ...base.banners, ...(overrides.banners || {}) },
      products: { ...base.products, ...(overrides.products || {}) },
    };
  }

  async loadImagePools() {
    const allImages = await this.readSourceImages();
    this.categoryImages = allImages;
    this.brandImages = allImages;
    this.bannerImages = allImages;
    this.productImages = allImages;
  }

  async readSourceImages() {
    try {
      const files = await fs.readdir(sourceImagesRoot);
      return files.filter((name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name));
    } catch (error) {
      logger.warn(
        `Source images folder not found or unreadable: ${sourceImagesRoot}`,
      );
      return [];
    }
  }

  async clearExistingData() {
    logger.info("Clearing existing catalog data...");
    await Promise.all([
      Product.deleteMany({}),
      Banner.deleteMany({}),
      Category.deleteMany({}),
      Brand.deleteMany({}),
    ]);
  }

  getStatusByRatio(index, count, activeRatio) {
    const activeCount = Math.max(0, Math.floor(count * activeRatio));
    return index < activeCount ? "active" : "inactive";
  }

  pickImagePath(files, index) {
    if (!files.length) return null;
    const fileName = files[index % files.length];
    return `/images/${fileName}`;
  }

  async seedCategories() {
    const { count, activeRatio } = this.config.categories;
    const docs = Array.from({ length: count }).map((_, index) => {
      const title = CATEGORY_NAMES[index % CATEGORY_NAMES.length];
      const status = this.getStatusByRatio(index, count, activeRatio);
      return {
        title,
        slug: `${toSlug(title)}-${index + 1}`,
        summary: `${title} category for demo storefront display`,
        photo: this.pickImagePath(this.categoryImages, index),
        status,
        isFeatured: index < 3,
        isNavigationVisible: true,
        sortOrder: index,
      };
    });

    const created = await Category.insertMany(docs);
    logger.info(`Seeded categories: ${created.length}`);
    return created.map((item) => item.toObject());
  }

  async seedBrands() {
    const { count, activeRatio } = this.config.brands;
    const docs = Array.from({ length: count }).map((_, index) => {
      const baseTitle = BRAND_NAMES[index % BRAND_NAMES.length];
      const cycle = Math.floor(index / BRAND_NAMES.length);
      const title = cycle === 0 ? baseTitle : `${baseTitle} ${cycle + 1}`;
      const status = this.getStatusByRatio(index, count, activeRatio);
      const logo = this.pickImagePath(this.brandImages, index);
      const bannerA = this.pickImagePath(this.brandImages, index + 1);
      const bannerB = this.pickImagePath(this.brandImages, index + 2);
      return {
        title,
        slug: `${toSlug(title)}-${index + 1}`,
        description: `${title} demo brand profile with temporary assets`,
        status,
        logo,
        banners: [bannerA, bannerB].filter(Boolean),
      };
    });

    const created = await Brand.insertMany(docs);
    logger.info(`Seeded brands: ${created.length}`);
    return created.map((item) => item.toObject());
  }

  async seedBanners() {
    const { count, activeRatio, scheduledRatio } = this.config.banners;
    const activeCount = Math.max(0, Math.floor(count * activeRatio));
    const scheduledCount = Math.max(0, Math.floor(count * scheduledRatio));

    const docs = Array.from({ length: count }).map((_, index) => {
      let status = "inactive";
      if (index < activeCount) status = "active";
      else if (index < activeCount + scheduledCount) status = "scheduled";

      const startDate =
        status === "scheduled"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null;
      const endDate =
        status === "scheduled"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null;

      return {
        title: `Promo Banner ${index + 1}`,
        slug: `promo-banner-${index + 1}`,
        description: `Temporary marketing banner ${index + 1} for UI preview`,
        image: this.pickImagePath(this.bannerImages, index),
        linkType: index % 2 === 0 ? "category" : "product",
        link: index % 2 === 0 ? "/categories" : "/products",
        linkTarget: "_self",
        sortOrder: index,
        status,
        startDate,
        endDate,
      };
    });

    const created = await Banner.insertMany(docs);
    logger.info(`Seeded banners: ${created.length}`);
    return created;
  }

  async seedProducts(categories, brands) {
    const { count, activeRatio, featuredRatio } = this.config.products;

    if (!categories.length || !brands.length) {
      throw new Error("Cannot seed products without categories and brands");
    }

    const docs = Array.from({ length: count }).map((_, index) => {
      const category = categories[index % categories.length];
      const brand = brands[index % brands.length];
      const status = this.getStatusByRatio(index, count, activeRatio);
      const isFeatured = index < Math.max(1, Math.floor(count * featuredRatio));
      const basePrice = 49 + index * 7;
      const baseDiscount = index % 3 === 0 ? 10 : index % 5 === 0 ? 15 : 0;

      const img1 = this.pickImagePath(this.productImages, index);
      const img2 = this.pickImagePath(this.productImages, index + 1);
      const img3 = this.pickImagePath(this.productImages, index + 2);

      const images = [img1, img2, img3]
        .filter(Boolean)
        .map((imgPath, imageIndex) => ({
          path: imgPath,
          isPrimary: imageIndex === 0,
          sortOrder: imageIndex,
          altText: `Product ${index + 1} image ${imageIndex + 1}`,
        }));

      return {
        title: PRODUCT_TITLES[index % PRODUCT_TITLES.length],
        slug: `${toSlug(PRODUCT_TITLES[index % PRODUCT_TITLES.length])}-${index + 1}`,
        summary: "Temporary seeded product for storefront and admin testing",
        description: `Demo product ${index + 1} linked with ${brand.title} in ${category.title}`,
        condition:
          index % 3 === 0 ? "new" : index % 4 === 0 ? "hot" : "default",
        status,
        isFeatured,
        hasVariants: false,
        basePrice,
        baseDiscount,
        baseStock: 20 + index * 3,
        baseSku: `TMP-${String(index + 1).padStart(4, "0")}`,
        size: ["S", "M", "L"],
        images,
        category: {
          id: category._id,
          title: category.title,
          slug: category.slug,
          path: category.path || category.title,
        },
        brand: {
          id: brand._id,
          title: brand.title,
          slug: brand.slug,
        },
        ratings: {
          average: 3.8 + (index % 5) * 0.2,
          count: 10 + index * 3,
          distribution: {
            1: 1,
            2: 1,
            3: 2,
            4: 3,
            5: 3,
          },
        },
        tags: [
          category.title.toLowerCase(),
          brand.title.toLowerCase(),
          "temp-seed",
        ],
      };
    });

    const created = await Product.insertMany(docs);
    logger.info(`Seeded products: ${created.length}`);
    return created;
  }
}

export const catalogSeeder = new CatalogSeeder();
