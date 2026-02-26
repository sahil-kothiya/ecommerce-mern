import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { Banner } from "../models/Banner.js";
import { Product } from "../models/Product.js";
import { VariantType } from "../models/VariantType.js";
import { VariantOption } from "../models/VariantOption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceImagesRoot = path.resolve(__dirname, "../../../images");
const FALLBACK_SEED_IMAGE = "/images/404-error-cyberpunk-5120x2880-18226.jpg";

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
    variantProductRatio: 0.95,
    minVariantsPerProduct: 3,
    maxVariantsPerProduct: 6,
    minProductsPerCategory: 0,
    imagesPerVariant: 3,
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
    this.variantTypesWithOptions = [];
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
      await this.loadVariantPools();
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

  async loadVariantPools() {
    const activeVariantTypes = await VariantType.find({ status: "active" })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    if (!activeVariantTypes.length) {
      throw new Error(
        "Cannot seed variant products without active variant types. Seed variant types/options first.",
      );
    }

    const options = await VariantOption.find({
      status: "active",
      variantTypeId: { $in: activeVariantTypes.map((type) => type._id) },
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const optionsByTypeId = new Map();
    options.forEach((option) => {
      const key = String(option.variantTypeId);
      if (!optionsByTypeId.has(key)) {
        optionsByTypeId.set(key, []);
      }
      optionsByTypeId.get(key).push(option);
    });

    this.variantTypesWithOptions = activeVariantTypes
      .map((type) => ({
        ...type,
        options: optionsByTypeId.get(String(type._id)) || [],
      }))
      .filter((type) => type.options.length >= 2);

    if (!this.variantTypesWithOptions.length) {
      throw new Error(
        "Cannot seed variant products: no active variant options found for active variant types.",
      );
    }
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

  buildImageSet(startIndex, count, altPrefix) {
    const items = [];

    for (let i = 0; i < count; i += 1) {
      const fallbackPath = FALLBACK_SEED_IMAGE;
      const imagePath =
        this.pickImagePath(this.productImages, startIndex + i) || fallbackPath;

      items.push({
        path: imagePath,
        isPrimary: i === 0,
        sortOrder: i,
        altText: `${altPrefix} image ${i + 1}`,
      });
    }

    return items;
  }

  validateCategoryMinimum(totalProducts, categoriesCount, minPerCategory) {
    const sanitizedMin = Math.max(0, Math.floor(minPerCategory));
    const minRequired = categoriesCount * sanitizedMin;

    if (sanitizedMin > 0 && totalProducts < minRequired) {
      throw new Error(
        `Cannot satisfy minProductsPerCategory=${sanitizedMin}. Required at least ${minRequired} products for ${categoriesCount} categories, received ${totalProducts}.`,
      );
    }
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
    const {
      count,
      activeRatio,
      featuredRatio,
      variantProductRatio,
      minVariantsPerProduct,
      maxVariantsPerProduct,
      minProductsPerCategory,
      imagesPerVariant,
    } = this.config.products;

    if (!categories.length || !brands.length) {
      throw new Error("Cannot seed products without categories and brands");
    }

    const variantTarget = Math.floor(count * variantProductRatio);
    const batchSize = 500;
    this.validateCategoryMinimum(
      count,
      categories.length,
      minProductsPerCategory,
    );

    let createdCount = 0;

    for (let start = 0; start < count; start += batchSize) {
      const end = Math.min(start + batchSize, count);
      const docs = [];

      for (let index = start; index < end; index += 1) {
        const category = categories[index % categories.length];
        const brand = brands[index % brands.length];
        const status = this.getStatusByRatio(index, count, activeRatio);
        const isFeatured =
          index < Math.max(1, Math.floor(count * featuredRatio));
        const basePrice = 49 + index * 7;
        const baseDiscount = index % 3 === 0 ? 10 : index % 5 === 0 ? 15 : 0;
        const hasVariants = index < variantTarget;
        const images = this.buildImageSet(
          index,
          Math.max(3, imagesPerVariant),
          `Product ${index + 1}`,
        );

        const productDoc = {
          title: PRODUCT_TITLES[index % PRODUCT_TITLES.length],
          slug: `${toSlug(PRODUCT_TITLES[index % PRODUCT_TITLES.length])}-${index + 1}`,
          summary: "Temporary seeded product for storefront and admin testing",
          description: `Demo product ${index + 1} linked with ${brand.title} in ${category.title}`,
          condition:
            index % 3 === 0 ? "new" : index % 4 === 0 ? "hot" : "default",
          status,
          isFeatured,
          hasVariants,
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

        if (hasVariants) {
          const variantTypes = this.pickVariantTypesForProduct(index);
          const variants = this.generateProductVariants({
            productIndex: index,
            title: productDoc.title,
            imagePool: images,
            variantTypes,
            minVariants: minVariantsPerProduct,
            maxVariants: maxVariantsPerProduct,
            basePrice,
            imagesPerVariant,
          });

          const variantPrices = variants.map((variant) => variant.price);
          const variantStocks = variants.map((variant) => variant.stock);

          productDoc.variants = variants;
          productDoc.basePrice = Math.min(...variantPrices);
          productDoc.baseDiscount = 0;
          productDoc.baseStock = variantStocks.reduce(
            (sum, stock) => sum + stock,
            0,
          );
        } else {
          productDoc.basePrice = basePrice;
          productDoc.baseDiscount = baseDiscount;
          productDoc.baseStock = 20 + index * 3;
          productDoc.baseSku = `TMP-${String(index + 1).padStart(5, "0")}`;
        }

        docs.push(productDoc);
      }

      const inserted = await Product.insertMany(docs);
      createdCount += inserted.length;
    }

    logger.info(`Seeded products: ${createdCount}`);
    return { count: createdCount };
  }

  pickVariantTypesForProduct(index) {
    if (this.variantTypesWithOptions.length === 1) {
      return [this.variantTypesWithOptions[0]];
    }

    const first =
      this.variantTypesWithOptions[index % this.variantTypesWithOptions.length];
    const second =
      this.variantTypesWithOptions[
        (index + 1) % this.variantTypesWithOptions.length
      ];

    if (String(first._id) === String(second._id)) {
      return [first];
    }

    return [first, second];
  }

  generateProductVariants({
    productIndex,
    title,
    imagePool,
    variantTypes,
    minVariants,
    maxVariants,
    basePrice,
    imagesPerVariant,
  }) {
    const targetCount = Math.max(
      minVariants,
      Math.min(
        maxVariants,
        minVariants +
          (productIndex % Math.max(1, maxVariants - minVariants + 1)),
      ),
    );

    const combinations = [];
    if (variantTypes.length === 1) {
      const [type] = variantTypes;
      type.options.slice(0, targetCount).forEach((option) => {
        combinations.push([{ type, option }]);
      });
    } else {
      const [typeA, typeB] = variantTypes;
      for (const optionA of typeA.options) {
        for (const optionB of typeB.options) {
          combinations.push([
            { type: typeA, option: optionA },
            { type: typeB, option: optionB },
          ]);
          if (combinations.length >= targetCount) break;
        }
        if (combinations.length >= targetCount) break;
      }
    }

    return combinations.map((combo, comboIndex) => {
      const optionValues = combo.map(({ option }) => option.displayValue);
      const optionSlug = combo
        .map(({ option }) => option.value.toUpperCase())
        .join("-");
      const priceDelta = (comboIndex % 5) * 3;

      return {
        sku: `VR-${String(productIndex + 1).padStart(5, "0")}-${optionSlug}`,
        displayName: `${title} - ${optionValues.join(" / ")}`,
        price: Math.round((basePrice + priceDelta) * 100) / 100,
        discount: comboIndex % 4 === 0 ? 8 : 0,
        stock: 10 + ((productIndex + comboIndex) % 60),
        status: "active",
        options: combo.map(({ type, option }) => ({
          typeId: type._id,
          typeName: type.name,
          typeDisplayName: type.displayName,
          optionId: option._id,
          value: option.value,
          displayValue: option.displayValue,
          hexColor: option.hexColor || null,
        })),
        images: imagePool
          .slice(0, Math.max(3, imagesPerVariant))
          .map((image) => ({ ...image })),
        variantValues: combo.map(({ option }) => option.value).join("|"),
      };
    });
  }
}

export const catalogSeeder = new CatalogSeeder();
