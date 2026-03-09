#!/usr/bin/env node

import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";
import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Category } from "./src/models/Category.js";
import { Brand } from "./src/models/Brand.js";
import { User } from "./src/models/User.js";
import { Product } from "./src/models/Product.js";
import { Order } from "./src/models/Order.js";
import { Review } from "./src/models/Review.js";
import { VariantType } from "./src/models/VariantType.js";
import { VariantOption } from "./src/models/VariantOption.js";
import { Banner } from "./src/models/Banner.js";
import { Coupon } from "./src/models/Coupon.js";
import { Discount } from "./src/models/Discount.js";
import { Filter } from "./src/models/Filter.js";
import { Setting } from "./src/models/Setting.js";
import { Shipping } from "./src/models/Shipping.js";
import { Cart } from "./src/models/Cart.js";
import { Wishlist } from "./src/models/Wishlist.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_IMAGES_DIR = path.resolve(__dirname, "../images");

const PRODUCT_BATCH_SIZE = 500;

const DEFAULTS = Object.freeze({
  categories: 16,
  brands: 12,
  users: 36,
  products: 200,
  orders: 120,
  reviews: 180,
  banners: 8,
  coupons: 10,
  discounts: 6,
  variantRatio: 0.98,
});

const STATUS_ACTIVE = "active";
const CATEGORY_PRESETS = Object.freeze([
  "Mobile Phones",
  "Televisions",
  "Laptops",
  "Tablets",
  "Smart Watches",
  "Headphones",
  "Cameras",
  "Gaming Consoles",
  "Men Clothing",
  "Women Clothing",
  "Shoes",
  "Home Furniture",
  "Kitchen Appliances",
  "Beauty Products",
  "Sports Equipment",
  "Books",
]);
const CATEGORY_VARIANT_TYPE_RULES = Object.freeze([
  {
    keywords: ["mobile", "phone", "smartphone"],
    types: ["ram", "storage", "color"],
  },
  { keywords: ["television", "tv"], types: ["screen-size"] },
  { keywords: ["laptop", "notebook"], types: ["ram", "storage", "color"] },
  { keywords: ["tablet"], types: ["storage", "color"] },
  { keywords: ["watch"], types: ["size", "color"] },
  { keywords: ["headphone", "earbud"], types: ["color"] },
  { keywords: ["camera"], types: ["storage", "color"] },
  { keywords: ["gaming", "console"], types: ["storage", "color"] },
  {
    keywords: ["clothing", "shirt", "fashion", "wear"],
    types: ["size", "color"],
  },
  { keywords: ["shoe", "sneaker"], types: ["size", "color"] },
  { keywords: ["furniture"], types: ["material", "color"] },
  { keywords: ["kitchen", "appliance"], types: ["capacity", "color"] },
]);
const SEEDED_ACCOUNT_DEFAULTS = Object.freeze({
  admin: {
    email: "admin@admin.com",
    password: "password123",
  },
  user: {
    email: "user@admin.com",
    password: "password123",
  },
});

function loadProjectSeedImages() {
  if (!fs.existsSync(PROJECT_IMAGES_DIR)) {
    throw new Error(
      `Project images directory not found at '${PROJECT_IMAGES_DIR}'.`,
    );
  }

  const webpFiles = fs
    .readdirSync(PROJECT_IMAGES_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith(".webp"))
    .sort();

  if (!webpFiles.length) {
    throw new Error(
      `No .webp images found in '${PROJECT_IMAGES_DIR}'. Seed requires local WebP images.`,
    );
  }

  return webpFiles;
}

const PROJECT_SEED_IMAGES = loadProjectSeedImages();

function hashString(value = "") {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getSeedImageByOffset(seed, offset = 0) {
  const base = hashString(seed);
  const index = (base + offset) % PROJECT_SEED_IMAGES.length;
  return `/images/${PROJECT_SEED_IMAGES[index]}`;
}

/**
 * Parse seeder CLI arguments.
 * @param {string[]} args
 * @returns {{ mode: "import" | "destroy", counts: typeof DEFAULTS }}
 */
export function parseCliArgs(args) {
  const normalized = Array.isArray(args) ? args : [];
  const mode = normalized.includes("--destroy") ? "destroy" : "import";
  const counts = { ...DEFAULTS };

  for (let index = 0; index < normalized.length; index += 1) {
    const arg = normalized[index];
    const next = normalized[index + 1];
    if (!next) continue;
    if (arg === "--categories")
      counts.categories = Math.max(
        1,
        Number.parseInt(next, 10) || DEFAULTS.categories,
      );
    if (arg === "--brands")
      counts.brands = Math.max(1, Number.parseInt(next, 10) || DEFAULTS.brands);
    if (arg === "--users")
      counts.users = Math.max(2, Number.parseInt(next, 10) || DEFAULTS.users);
    if (arg === "--products")
      counts.products = Math.max(
        10,
        Number.parseInt(next, 10) || DEFAULTS.products,
      );
    if (arg === "--orders")
      counts.orders = Math.max(1, Number.parseInt(next, 10) || DEFAULTS.orders);
    if (arg === "--reviews")
      counts.reviews = Math.max(
        1,
        Number.parseInt(next, 10) || DEFAULTS.reviews,
      );
    if (arg === "--banners")
      counts.banners = Math.max(
        1,
        Number.parseInt(next, 10) || DEFAULTS.banners,
      );
    if (arg === "--coupons")
      counts.coupons = Math.max(
        1,
        Number.parseInt(next, 10) || DEFAULTS.coupons,
      );
    if (arg === "--discounts")
      counts.discounts = Math.max(
        1,
        Number.parseInt(next, 10) || DEFAULTS.discounts,
      );
  }

  return { mode, counts };
}

/**
 * Ensure required runtime environment variables exist.
 */
function validateEnv() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing required environment variable: MONGODB_URI");
  }
}

/**
 * Open MongoDB connection.
 */
async function connectDatabase() {
  validateEnv();
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

/**
 * Close MongoDB connection.
 */
async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

/**
 * Destroy seeded collections.
 */
export async function destroyData() {
  console.log("[Seeder] Destroying data...");
  await Promise.all([
    Review.deleteMany({}),
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Wishlist.deleteMany({}),
    Product.deleteMany({}),
    Discount.deleteMany({}),
    Banner.deleteMany({}),
    Coupon.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Filter.deleteMany({}),
    Shipping.deleteMany({}),
    Setting.deleteMany({}),
    VariantOption.deleteMany({}),
    VariantType.deleteMany({}),
  ]);
  console.log("[Seeder] Data destruction complete");
}

function buildSlug(value, takenSlugs) {
  const base =
    slugify(value, { lower: true, strict: true }) ||
    faker.string.alphanumeric(8).toLowerCase();
  let candidate = base;
  let counter = 1;
  while (takenSlugs.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  takenSlugs.add(candidate);
  return candidate;
}

function createCategoryCode(index) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const first = alphabet[index % alphabet.length];
  const second =
    alphabet[Math.floor(index / alphabet.length) % alphabet.length];
  const third =
    alphabet[
      Math.floor(index / (alphabet.length * alphabet.length)) % alphabet.length
    ];
  return `${third}${second}${first}`;
}

function getSeededAccountCredentials() {
  const adminEmail = String(
    process.env.SEED_ADMIN_EMAIL || SEEDED_ACCOUNT_DEFAULTS.admin.email,
  )
    .trim()
    .toLowerCase();
  const adminPassword = String(
    process.env.SEED_ADMIN_PASSWORD || SEEDED_ACCOUNT_DEFAULTS.admin.password,
  ).trim();
  const userEmail = String(
    process.env.SEED_USER_EMAIL || SEEDED_ACCOUNT_DEFAULTS.user.email,
  )
    .trim()
    .toLowerCase();
  const userPassword = String(
    process.env.SEED_USER_PASSWORD || SEEDED_ACCOUNT_DEFAULTS.user.password,
  ).trim();

  if (!adminEmail || !userEmail) {
    throw new Error("Seeded account emails cannot be empty");
  }
  if (adminEmail === userEmail) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_USER_EMAIL must be different");
  }
  if (adminPassword.length < 8 || userPassword.length < 8) {
    throw new Error("Seeded account passwords must be at least 8 characters");
  }

  return {
    admin: { email: adminEmail, password: adminPassword },
    user: { email: userEmail, password: userPassword },
  };
}

function pickTags(title, brandTitle) {
  const pool = [
    "trending",
    "premium",
    "new-arrival",
    "editor-pick",
    "quality",
    ...title.toLowerCase().split(/\s+/),
    ...brandTitle.toLowerCase().split(/\s+/),
  ].filter((entry) => entry.length > 2);
  return Array.from(
    new Set(faker.helpers.arrayElements(pool, { min: 3, max: 6 })),
  );
}

function buildProductTitleForCategory(categoryTitle, brandTitle) {
  const normalized = String(categoryTitle || "").toLowerCase();
  const adjective = faker.commerce.productAdjective();
  const brandPrefix = brandTitle ? `${brandTitle} ` : "";

  if (normalized.includes("mobile") || normalized.includes("phone")) {
    return `${brandPrefix}${adjective} Smartphone`;
  }
  if (normalized.includes("television") || normalized.includes("tv")) {
    return `${brandPrefix}${adjective} Smart TV`;
  }
  if (normalized.includes("laptop")) {
    return `${brandPrefix}${adjective} Laptop`;
  }
  if (normalized.includes("tablet")) {
    return `${brandPrefix}${adjective} Tablet`;
  }
  if (normalized.includes("watch")) {
    return `${brandPrefix}${adjective} Smart Watch`;
  }
  if (normalized.includes("headphone")) {
    return `${brandPrefix}${adjective} Headphones`;
  }
  if (normalized.includes("camera")) {
    return `${brandPrefix}${adjective} Camera`;
  }
  if (normalized.includes("gaming") || normalized.includes("console")) {
    return `${brandPrefix}${adjective} Gaming Console`;
  }
  if (normalized.includes("kitchen") || normalized.includes("appliance")) {
    return `${brandPrefix}${adjective} Kitchen Appliance`;
  }
  if (normalized.includes("shoe")) {
    return `${brandPrefix}${adjective} Shoes`;
  }
  if (normalized.includes("clothing")) {
    return `${brandPrefix}${adjective} Apparel`;
  }
  if (normalized.includes("furniture")) {
    return `${brandPrefix}${adjective} Furniture`;
  }
  if (normalized.includes("beauty")) {
    return `${brandPrefix}${adjective} Beauty Product`;
  }
  if (normalized.includes("book")) {
    return `${brandPrefix}${adjective} Book`;
  }
  if (normalized.includes("sports")) {
    return `${brandPrefix}${adjective} Sports Gear`;
  }

  return `${brandPrefix}${adjective} ${faker.commerce.product()}`;
}

function buildProductImages(slug) {
  const first = getSeedImageByOffset(`${slug}-product`, 0);
  const second = getSeedImageByOffset(`${slug}-product`, 1);
  return [
    {
      path: first,
      altText: `${slug} primary image`,
      isPrimary: true,
      sortOrder: 0,
    },
    {
      path: second,
      altText: `${slug} gallery image`,
      isPrimary: false,
      sortOrder: 1,
    },
  ];
}

function buildVariantImages(seed) {
  return [
    {
      path: getSeedImageByOffset(`${seed}-variant`, 0),
      altText: `${seed} variant image`,
      isPrimary: true,
      sortOrder: 0,
    },
    {
      path: getSeedImageByOffset(`${seed}-variant`, 1),
      altText: `${seed} variant alternate image`,
      isPrimary: false,
      sortOrder: 1,
    },
  ];
}

async function ensureVariantCatalog() {
  console.log("[Seeder] Preparing variant catalog...");
  const requiredTypes = [
    { name: "size", displayName: "Size" },
    { name: "color", displayName: "Color" },
    { name: "ram", displayName: "RAM" },
    { name: "storage", displayName: "Storage" },
    { name: "screen-size", displayName: "Screen Size" },
    { name: "material", displayName: "Material" },
    { name: "capacity", displayName: "Capacity" },
  ];
  const requiredOptionsByType = {
    size: [
      { value: "s", displayValue: "S" },
      { value: "m", displayValue: "M" },
      { value: "l", displayValue: "L" },
      { value: "xl", displayValue: "XL" },
    ],
    color: [
      { value: "black", displayValue: "Black", hexColor: "#000000" },
      { value: "white", displayValue: "White", hexColor: "#FFFFFF" },
      { value: "blue", displayValue: "Blue", hexColor: "#1D4ED8" },
      { value: "red", displayValue: "Red", hexColor: "#DC2626" },
      { value: "green", displayValue: "Green", hexColor: "#059669" },
    ],
    ram: [
      { value: "4gb", displayValue: "4 GB" },
      { value: "6gb", displayValue: "6 GB" },
      { value: "8gb", displayValue: "8 GB" },
      { value: "12gb", displayValue: "12 GB" },
    ],
    storage: [
      { value: "64gb", displayValue: "64 GB" },
      { value: "128gb", displayValue: "128 GB" },
      { value: "256gb", displayValue: "256 GB" },
      { value: "512gb", displayValue: "512 GB" },
    ],
    "screen-size": [
      { value: "32-inch", displayValue: '32"' },
      { value: "43-inch", displayValue: '43"' },
      { value: "55-inch", displayValue: '55"' },
      { value: "65-inch", displayValue: '65"' },
    ],
    material: [
      { value: "plastic", displayValue: "Plastic" },
      { value: "metal", displayValue: "Metal" },
      { value: "wood", displayValue: "Wood" },
      { value: "fabric", displayValue: "Fabric" },
    ],
    capacity: [
      { value: "500ml", displayValue: "500 ml" },
      { value: "1l", displayValue: "1 L" },
      { value: "2l", displayValue: "2 L" },
      { value: "5l", displayValue: "5 L" },
    ],
  };

  const typeBulkOps = requiredTypes.map((rt, index) => ({
    updateOne: {
      filter: { name: rt.name },
      update: {
        $setOnInsert: {
          name: rt.name,
          displayName: rt.displayName,
          sortOrder: index + 1,
        },
        $set: { status: STATUS_ACTIVE },
      },
      upsert: true,
    },
  }));
  await VariantType.bulkWrite(typeBulkOps);

  const typeByName = {};
  const allTypes = await VariantType.find({
    name: { $in: requiredTypes.map((rt) => rt.name) },
  }).lean();
  for (const typeDoc of allTypes) {
    typeByName[typeDoc.name] = typeDoc;
  }

  const optionBulkOps = [];
  for (const requiredType of requiredTypes) {
    const typeDoc = typeByName[requiredType.name];
    const requiredOptions = requiredOptionsByType[requiredType.name] || [];
    for (const [index, option] of requiredOptions.entries()) {
      optionBulkOps.push({
        updateOne: {
          filter: { variantTypeId: typeDoc._id, value: option.value },
          update: {
            $setOnInsert: {
              variantTypeId: typeDoc._id,
              value: option.value,
              displayValue: option.displayValue,
              hexColor: option.hexColor || null,
              sortOrder: index + 1,
            },
            $set: { status: STATUS_ACTIVE },
          },
          upsert: true,
        },
      });
    }
  }
  if (optionBulkOps.length > 0) {
    await VariantOption.bulkWrite(optionBulkOps);
  }

  const optionsByType = {};
  for (const requiredType of requiredTypes) {
    const typeDoc = typeByName[requiredType.name];
    const activeOptions = await VariantOption.find({
      variantTypeId: typeDoc._id,
      status: STATUS_ACTIVE,
    })
      .sort({ sortOrder: 1, displayValue: 1 })
      .lean();

    if (activeOptions.length < 2) {
      throw new Error(
        `Variant type '${requiredType.name}' must have at least 2 active options for seeding.`,
      );
    }
    optionsByType[requiredType.name] = activeOptions;
  }

  console.log(
    `[Seeder] Variant catalog ready: ${Object.keys(optionsByType)
      .map((name) => `${name}=${optionsByType[name].length}`)
      .join(", ")}`,
  );

  return { types: typeByName, options: optionsByType };
}

function pickCategoryVariantTypeNames(categoryTitle, variantCatalog) {
  const normalizedTitle = String(categoryTitle || "").toLowerCase();
  const matchedRule = CATEGORY_VARIANT_TYPE_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedTitle.includes(keyword)),
  );

  const candidateTypes = matchedRule?.types || ["size", "color"];
  const availableTypes = candidateTypes.filter(
    (typeName) =>
      variantCatalog.types[typeName] &&
      Array.isArray(variantCatalog.options[typeName]) &&
      variantCatalog.options[typeName].length >= 2,
  );

  if (availableTypes.length > 0) {
    return availableTypes;
  }

  return Object.keys(variantCatalog.options).filter(
    (typeName) => variantCatalog.options[typeName].length >= 2,
  );
}

function buildOptionMatrix(typeNames, variantCatalog) {
  return typeNames.map((typeName) => {
    const type = variantCatalog.types[typeName];
    const options = variantCatalog.options[typeName].slice(0, 2);
    return options.map((option) => ({
      typeId: type._id,
      typeName: type.name,
      typeDisplayName: type.displayName,
      optionId: option._id,
      value: option.value,
      displayValue: option.displayValue,
      hexColor: option.hexColor || null,
    }));
  });
}

function cartesianProduct(list) {
  return list.reduce(
    (acc, items) =>
      acc.flatMap((entry) => items.map((item) => [...entry, item])),
    [[]],
  );
}

function buildVariants({
  productSerial,
  minPrice,
  categoryTitle,
  variantCatalog,
}) {
  const typeNames = pickCategoryVariantTypeNames(categoryTitle, variantCatalog);
  const optionMatrix = buildOptionMatrix(typeNames, variantCatalog);
  const combinations = cartesianProduct(optionMatrix).filter(
    (combo) => combo.length > 0,
  );

  if (combinations.length < 2) {
    throw new Error(
      `Not enough variant combinations for category '${categoryTitle}'.`,
    );
  }

  const limitedCombinations = combinations.slice(
    0,
    Math.min(4, combinations.length),
  );

  return limitedCombinations.map((options, index) => {
    const key = options
      .map((option) => `${option.typeName}:${option.value}`)
      .sort()
      .join("|");
    const readableVariant = options
      .map((option) => option.displayValue)
      .join(" / ");
    const suffix = readableVariant.toUpperCase().replace(/[^A-Z0-9]+/g, "-");

    return {
      sku: `PROD-${productSerial}-${suffix}`,
      displayName: readableVariant,
      price: minPrice + index * 10 + 5,
      stock: 20 + index * 7,
      status: STATUS_ACTIVE,
      discount: index % 2 === 0 ? 5 : 10,
      options,
      images: buildVariantImages(`${productSerial}-${index + 1}`),
      variantValues: key,
    };
  });
}

async function seedCategories(count) {
  console.log("[Seeder] Seeding categories...");
  const takenSlugs = new Set();
  const categories = Array.from({ length: count }, (_, index) => {
    const presetTitle = CATEGORY_PRESETS[index];
    const title =
      presetTitle ||
      `${faker.commerce.department()} ${faker.helpers.arrayElement(["Collection", "Store", "Essentials", "Hub"])}`;
    return {
      title,
      slug: buildSlug(title, takenSlugs),
      code: createCategoryCode(index),
      summary: faker.commerce.productDescription(),
      level: 0,
      path: title,
      sortOrder: index,
      status: STATUS_ACTIVE,
      isFeatured: faker.datatype.boolean({ probability: 0.25 }),
      isNavigationVisible: true,
    };
  });

  await Category.insertMany(categories, { ordered: false });
  const created = await Category.find({ status: STATUS_ACTIVE }).lean();
  console.log(`[Seeder] Categories seeded: ${created.length}`);
  return created;
}

async function seedBrands(count) {
  console.log("[Seeder] Seeding brands...");
  const takenSlugs = new Set();
  const brands = Array.from({ length: count }, () => {
    const title = faker.company.name();
    const slug = buildSlug(title, takenSlugs);
    return {
      title,
      slug,
      description: faker.company.catchPhrase(),
      logo: getSeedImageByOffset(`brand-${slug}`, 0),
      status: STATUS_ACTIVE,
    };
  });

  await Brand.insertMany(brands, { ordered: false });
  const created = await Brand.find({ status: STATUS_ACTIVE }).lean();
  console.log(`[Seeder] Brands seeded: ${created.length}`);
  return created;
}

async function seedUsers(count) {
  console.log("[Seeder] Seeding users...");
  const users = [];
  const seededCredentials = getSeededAccountCredentials();
  const usedEmails = new Set([
    seededCredentials.admin.email,
    seededCredentials.user.email,
  ]);

  users.push({
    name: "Admin User",
    email: seededCredentials.admin.email,
    password: seededCredentials.admin.password,
    phone: faker.phone.number(),
    role: "admin",
    status: STATUS_ACTIVE,
    addresses: [
      {
        label: "Primary",
        firstName: "Admin",
        lastName: "User",
        phone: faker.phone.number(),
        address1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postCode: faker.location.zipCode(),
        country: faker.location.country(),
        isDefault: true,
      },
    ],
    emailVerified: true,
  });

  users.push({
    name: "Demo User",
    email: seededCredentials.user.email,
    password: seededCredentials.user.password,
    phone: faker.phone.number(),
    role: "user",
    status: STATUS_ACTIVE,
    addresses: [
      {
        label: "Primary",
        firstName: "Demo",
        lastName: "User",
        phone: faker.phone.number(),
        address1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postCode: faker.location.zipCode(),
        country: faker.location.country(),
        isDefault: true,
      },
    ],
    emailVerified: true,
  });

  for (let index = 2; index < count; index += 1) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    let email = faker.internet.email({ firstName, lastName }).toLowerCase();
    while (usedEmails.has(email)) {
      email = faker.internet
        .email({ firstName, lastName, provider: "example.com" })
        .toLowerCase();
    }
    usedEmails.add(email);

    users.push({
      name: `${firstName} ${lastName}`,
      email,
      password: "Password@123",
      phone: faker.phone.number(),
      role: "user",
      status: STATUS_ACTIVE,
      addresses: [
        {
          label: "Primary",
          firstName,
          lastName,
          phone: faker.phone.number(),
          address1: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          postCode: faker.location.zipCode(),
          country: faker.location.country(),
          isDefault: true,
        },
      ],
      emailVerified: true,
    });
  }

  await User.create(users);
  const created = await User.find({ status: STATUS_ACTIVE }).lean();
  console.log(`[Seeder] Users seeded: ${created.length}`);
  console.log(
    `[Seeder] Seed accounts ready: admin=${seededCredentials.admin.email}, user=${seededCredentials.user.email}`,
  );
  return created;
}

async function seedProducts(count, categories, brands, variantCatalog) {
  console.log("[Seeder] Seeding products...");
  const takenSlugs = new Set();
  const withVariantCount = Math.max(
    1,
    Math.floor(count * DEFAULTS.variantRatio),
  );
  const withoutVariantCount = count - withVariantCount;
  let totalInserted = 0;
  let batch = [];

  for (let index = 0; index < count; index += 1) {
    const category = faker.helpers.arrayElement(categories);
    const brand = faker.helpers.arrayElement(brands);
    const title = buildProductTitleForCategory(category.title, brand.title);
    const slug = buildSlug(`${title}-${brand.slug}-${index + 1}`, takenSlugs);
    const productSerial = String(index + 1).padStart(6, "0");
    const hasVariants = index < withVariantCount;
    const basePrice = faker.number.int({ min: 18, max: 240 });

    const productDoc = {
      title,
      slug,
      summary: faker.commerce.productDescription(),
      description: faker.commerce.productDescription(),
      condition: faker.helpers.arrayElement(["default", "new", "hot"]),
      status: STATUS_ACTIVE,
      isFeatured: faker.datatype.boolean({ probability: 0.28 }),
      hasVariants,
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
      images: buildProductImages(slug),
      tags: pickTags(title, brand.title),
      ratings: {
        average: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
        count: faker.number.int({ min: 5, max: 700 }),
        distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 3 },
      },
      viewCount: faker.number.int({ min: 20, max: 4000 }),
      salesCount: faker.number.int({ min: 2, max: 800 }),
    };

    if (hasVariants) {
      const variants = buildVariants({
        productSerial,
        minPrice: basePrice,
        categoryTitle: category.title,
        variantCatalog,
      });
      const prices = variants.map((variant) => variant.price);
      productDoc.variants = variants;
      productDoc.basePrice = Math.min(...prices);
      productDoc.baseDiscount = 0;
      productDoc.baseStock = variants.reduce(
        (total, variant) => total + variant.stock,
        0,
      );
    } else {
      productDoc.basePrice = basePrice;
      productDoc.baseDiscount = faker.number.int({ min: 0, max: 15 });
      productDoc.baseStock = faker.number.int({ min: 5, max: 200 });
      productDoc.baseSku = `PROD-${productSerial}-BASE`;
      productDoc.variants = [];
    }

    batch.push(productDoc);

    if (batch.length >= PRODUCT_BATCH_SIZE || index === count - 1) {
      await Product.insertMany(batch, { ordered: false });
      totalInserted += batch.length;
      console.log(
        `[Seeder] Products progress: ${totalInserted}/${count} inserted`,
      );
      batch = [];
    }
  }

  const created = await Product.find({ status: STATUS_ACTIVE }).lean();
  if (created.length !== count) {
    throw new Error(
      `Product insert mismatch. Expected ${count}, inserted ${created.length}. Check product validation/index constraints.`,
    );
  }
  console.log(
    `[Seeder] Products seeded: ${created.length} (with variants: ${withVariantCount}, without variants: ${withoutVariantCount})`,
  );
  return created;
}

function pickOrderItem(product) {
  if (
    product.hasVariants &&
    Array.isArray(product.variants) &&
    product.variants.length > 0
  ) {
    const variant = faker.helpers.arrayElement(product.variants);
    const quantity = faker.number.int({ min: 1, max: 3 });
    return {
      productId: product._id,
      variantId: variant._id,
      title: product.title,
      sku: variant.sku,
      price: variant.price,
      quantity,
      amount: variant.price * quantity,
      image: product.images?.[0]?.path || "",
    };
  }

  const quantity = faker.number.int({ min: 1, max: 3 });
  return {
    productId: product._id,
    variantId: null,
    title: product.title,
    sku: product.baseSku,
    price: product.basePrice,
    quantity,
    amount: product.basePrice * quantity,
    image: product.images?.[0]?.path || "",
  };
}

async function seedOrders(count, users, products) {
  console.log("[Seeder] Seeding orders...");
  const orders = [];
  const ORDER_STATUSES = ["new", "process", "delivered", "cancelled"];

  for (let index = 0; index < count; index += 1) {
    const user = faker.helpers.arrayElement(users);
    const productPool = faker.helpers.arrayElements(
      products,
      faker.number.int({ min: 1, max: 3 }),
    );
    const items = productPool.map((product) => pickOrderItem(product));
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const shippingCost = faker.number.int({ min: 0, max: 20 });
    const couponDiscount = faker.number.int({ min: 0, max: 15 });
    const totalAmount = Math.max(0, subTotal + shippingCost - couponDiscount);
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const defaultAddress = Array.isArray(user.addresses)
      ? user.addresses.find((address) => address.isDefault) || user.addresses[0]
      : null;

    const firstName = defaultAddress?.firstName || faker.person.firstName();
    const lastName = defaultAddress?.lastName || faker.person.lastName();
    const orderStatus = faker.helpers.arrayElement(ORDER_STATUSES);
    const paymentStatus =
      orderStatus === "delivered"
        ? "paid"
        : faker.helpers.arrayElement(["paid", "unpaid"]);

    orders.push({
      userId: user._id,
      items,
      subTotal,
      shippingCost,
      couponDiscount,
      totalAmount,
      quantity,
      firstName,
      lastName,
      email: user.email,
      phone: defaultAddress?.phone || faker.phone.number(),
      address1: defaultAddress?.address1 || faker.location.streetAddress(),
      address2: defaultAddress?.address2 || "",
      city: defaultAddress?.city || faker.location.city(),
      state: defaultAddress?.state || faker.location.state(),
      postCode: defaultAddress?.postCode || faker.location.zipCode(),
      country: defaultAddress?.country || faker.location.country(),
      paymentMethod: faker.helpers.arrayElement(["cod", "stripe", "paypal"]),
      paymentStatus,
      status: orderStatus,
      idempotencyKey: `seed-${user._id.toString()}-${index + 1}-${faker.string.alphanumeric(8).toLowerCase()}`,
      notes: faker.lorem.sentence(),
    });
  }

  await Order.insertMany(orders, { ordered: false });
  const created = await Order.find({}).lean();
  console.log(`[Seeder] Orders seeded: ${created.length}`);
  return created;
}

async function seedReviews(count, users, products, orders) {
  console.log("[Seeder] Seeding reviews...");
  const reviews = [];
  const pairSet = new Set();
  const maxPossiblePairs = users.length * products.length;
  const targetCount = Math.min(count, maxPossiblePairs);
  let attempts = 0;
  const maxAttempts = targetCount * 5;

  const ordersByUser = new Map();
  for (const order of orders) {
    const userId = order.userId.toString();
    if (!ordersByUser.has(userId)) {
      ordersByUser.set(userId, []);
    }
    ordersByUser.get(userId).push(order);
  }

  while (reviews.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const user = faker.helpers.arrayElement(users);
    const product = faker.helpers.arrayElement(products);
    const pairKey = `${user._id.toString()}:${product._id.toString()}`;
    if (pairSet.has(pairKey)) continue;
    pairSet.add(pairKey);

    const userOrders = ordersByUser.get(user._id.toString()) || [];
    const relatedOrder = userOrders.find((order) =>
      order.items?.some(
        (item) => item.productId?.toString() === product._id.toString(),
      ),
    );

    reviews.push({
      productId: product._id,
      userId: user._id,
      orderId: relatedOrder?._id || null,
      rating: faker.number.int({ min: 3, max: 5 }),
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      comment: faker.lorem.paragraph({ min: 1, max: 2 }),
      isVerifiedPurchase: Boolean(relatedOrder),
      status: STATUS_ACTIVE,
      helpful: faker.number.int({ min: 0, max: 50 }),
    });
  }

  if (reviews.length > 0) {
    await Review.insertMany(reviews, { ordered: false });
  }
  const created = await Review.find({ status: STATUS_ACTIVE }).lean();
  console.log(
    `[Seeder] Reviews seeded: ${created.length} (requested: ${count}, max pairs: ${maxPossiblePairs})`,
  );
}

async function seedSettings() {
  console.log("[Seeder] Seeding settings...");
  await Setting.findOneAndUpdate(
    { key: "main" },
    {
      $setOnInsert: {
        key: "main",
        siteName: "Enterprise E-Commerce",
        siteTagline: "Your one-stop shop for everything",
        siteUrl: "http://localhost:5173",
        websiteEmail: "info@enterprise-ecommerce.com",
        supportEmail: "support@enterprise-ecommerce.com",
        phone: "+1-555-0100",
        whatsapp: "+1-555-0100",
        address: "123 Commerce St, Tech City, TC 10001",
        currencyCode: "USD",
        currencySymbol: "$",
        timezone: "UTC",
        maintenanceMode: false,
        metaTitle: "Enterprise E-Commerce - Premium Online Shopping",
        metaDescription:
          "Shop millions of products with fast delivery and secure payments.",
        facebook: "https://facebook.com/enterprise-ecommerce",
        instagram: "https://instagram.com/enterprise-ecommerce",
        twitter: "https://twitter.com/enterprise-ecom",
        youtube: "https://youtube.com/@enterprise-ecommerce",
      },
    },
    { upsert: true, new: true },
  );
  console.log("[Seeder] Settings seeded");
}

async function seedFilters() {
  console.log("[Seeder] Seeding filters...");
  const filterPresets = [
    {
      name: "price-range",
      title: "Price Range",
      description: "Filter products by price range",
    },
    { name: "brand", title: "Brand", description: "Filter products by brand" },
    { name: "color", title: "Color", description: "Filter products by color" },
    { name: "size", title: "Size", description: "Filter products by size" },
    {
      name: "rating",
      title: "Rating",
      description: "Filter products by customer rating",
    },
    {
      name: "availability",
      title: "Availability",
      description: "Filter products by stock availability",
    },
    {
      name: "condition",
      title: "Condition",
      description: "Filter by product condition",
    },
    {
      name: "discount",
      title: "Discount",
      description: "Filter products on sale",
    },
  ];

  const filters = filterPresets.map((preset) => ({
    ...preset,
    status: STATUS_ACTIVE,
  }));

  await Filter.insertMany(filters, { ordered: false });
  const created = await Filter.find({ status: STATUS_ACTIVE }).lean();
  console.log(`[Seeder] Filters seeded: ${created.length}`);
  return created;
}

async function seedShipping() {
  console.log("[Seeder] Seeding shipping methods...");
  const shippingPresets = [
    {
      type: "Standard Shipping",
      price: 5.99,
      estimatedDays: 7,
      description: "Standard delivery within 5-7 business days",
      sortOrder: 0,
    },
    {
      type: "Express Shipping",
      price: 12.99,
      estimatedDays: 3,
      description: "Express delivery within 2-3 business days",
      sortOrder: 1,
    },
    {
      type: "Next Day Delivery",
      price: 24.99,
      estimatedDays: 1,
      description: "Guaranteed next business day delivery",
      sortOrder: 2,
    },
    {
      type: "Free Shipping",
      price: 0,
      estimatedDays: 10,
      description: "Free delivery on orders over $50 (7-10 business days)",
      sortOrder: 3,
    },
  ];

  const methods = shippingPresets.map((preset) => ({
    ...preset,
    status: STATUS_ACTIVE,
  }));

  await Shipping.insertMany(methods, { ordered: false });
  const created = await Shipping.find({ status: STATUS_ACTIVE }).lean();
  console.log(`[Seeder] Shipping methods seeded: ${created.length}`);
  return created;
}

async function seedBanners(count, categories) {
  console.log("[Seeder] Seeding banners...");
  const now = new Date();
  const bannerPresets = [
    {
      title: "Summer Sale - Up to 50% Off",
      linkType: "category",
      status: "active",
    },
    { title: "New Arrivals This Week", linkType: "category", status: "active" },
    {
      title: "Free Shipping on Orders Over $50",
      linkType: "page",
      status: "active",
    },
    {
      title: "Flash Deal - Limited Time Offer",
      linkType: "category",
      status: "active",
    },
    {
      title: "Clearance Sale - Last Chance",
      linkType: "category",
      status: "active",
    },
    {
      title: "Holiday Special Collection",
      linkType: "category",
      status: "scheduled",
    },
    {
      title: "Back to School Essentials",
      linkType: "category",
      status: "scheduled",
    },
    { title: "Premium Brands Week", linkType: "page", status: "active" },
  ];

  const banners = Array.from(
    { length: Math.min(count, bannerPresets.length) },
    (_, index) => {
      const preset = bannerPresets[index];
      const category = faker.helpers.arrayElement(categories);
      const isScheduled = preset.status === "scheduled";

      return {
        title: preset.title,
        description: faker.commerce.productDescription(),
        image: getSeedImageByOffset(`banner-${index + 1}`, 0),
        link:
          preset.linkType === "category"
            ? `/category/${category.slug}`
            : "/shop",
        linkType: preset.linkType,
        linkTarget: "_self",
        sortOrder: index,
        status: preset.status,
        startDate: isScheduled
          ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null,
        endDate: isScheduled
          ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          : null,
        clickCount: isScheduled ? 0 : faker.number.int({ min: 10, max: 500 }),
        viewCount: isScheduled ? 0 : faker.number.int({ min: 200, max: 5000 }),
      };
    },
  );

  await Banner.insertMany(banners, { ordered: false });
  const created = await Banner.find({}).lean();
  console.log(`[Seeder] Banners seeded: ${created.length}`);
  return created;
}

async function seedCoupons(count) {
  console.log("[Seeder] Seeding coupons...");
  const now = new Date();
  const couponPresets = [
    {
      code: "WELCOME10",
      type: "percent",
      value: 10,
      description: "Welcome discount - 10% off your first order",
    },
    {
      code: "FLAT20",
      type: "fixed",
      value: 20,
      description: "Flat $20 off on orders above $100",
    },
    {
      code: "SUMMER25",
      type: "percent",
      value: 25,
      description: "Summer sale 25% discount",
    },
    {
      code: "FREESHIP",
      type: "fixed",
      value: 5.99,
      description: "Free shipping coupon",
    },
    {
      code: "VIP30",
      type: "percent",
      value: 30,
      description: "VIP members exclusive 30% off",
    },
    {
      code: "SAVE15",
      type: "percent",
      value: 15,
      description: "Save 15% on selected items",
    },
    {
      code: "MEGA50",
      type: "fixed",
      value: 50,
      description: "Mega sale $50 off on $200+",
    },
    {
      code: "HOLIDAY20",
      type: "percent",
      value: 20,
      description: "Holiday special 20% off",
    },
    {
      code: "FLASH10",
      type: "fixed",
      value: 10,
      description: "Flash sale $10 off",
    },
    {
      code: "LOYAL5",
      type: "percent",
      value: 5,
      description: "Loyalty reward 5% off",
    },
  ];

  const coupons = Array.from(
    { length: Math.min(count, couponPresets.length) },
    (_, index) => {
      const preset = couponPresets[index];
      const isExpired = index > 7;

      return {
        code: preset.code,
        type: preset.type,
        value: preset.value,
        description: preset.description,
        minPurchase:
          preset.type === "fixed"
            ? preset.value * 3
            : faker.number.int({ min: 20, max: 100 }),
        maxDiscount:
          preset.type === "percent"
            ? faker.number.int({ min: 30, max: 100 })
            : undefined,
        usageLimit: faker.number.int({ min: 50, max: 500 }),
        usedCount: faker.number.int({ min: 0, max: 20 }),
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        expiryDate: isExpired
          ? new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        status: isExpired ? "inactive" : STATUS_ACTIVE,
      };
    },
  );

  await Coupon.insertMany(coupons, { ordered: false });
  const created = await Coupon.find({}).lean();
  console.log(`[Seeder] Coupons seeded: ${created.length}`);
  return created;
}

async function seedDiscounts(count, categories, products) {
  console.log("[Seeder] Seeding discounts...");
  const now = new Date();
  const discountPresets = [
    { title: "Summer Electronics Sale", type: "percentage", value: 15 },
    { title: "Clearance Flat Discount", type: "fixed", value: 25 },
    { title: "Weekend Flash Deal", type: "percentage", value: 20 },
    { title: "New Year Special", type: "percentage", value: 10 },
    { title: "Premium Bundle Discount", type: "fixed", value: 50 },
    { title: "Member Exclusive Offer", type: "percentage", value: 30 },
  ];

  const discounts = Array.from(
    { length: Math.min(count, discountPresets.length) },
    (_, index) => {
      const preset = discountPresets[index];
      const useCategories = index % 2 === 0;
      const startsAt = new Date(
        now.getTime() -
          faker.number.int({ min: 1, max: 15 }) * 24 * 60 * 60 * 1000,
      );
      const endsAt = new Date(
        now.getTime() +
          faker.number.int({ min: 15, max: 60 }) * 24 * 60 * 60 * 1000,
      );

      return {
        title: preset.title,
        type: preset.type,
        value: preset.value,
        startsAt,
        endsAt,
        isActive: true,
        priority: index,
        categories: useCategories
          ? faker.helpers
              .arrayElements(categories, { min: 1, max: 3 })
              .map((cat) => cat._id)
          : [],
        products: useCategories
          ? []
          : faker.helpers
              .arrayElements(products, { min: 2, max: 6 })
              .map((prod) => prod._id),
      };
    },
  );

  await Discount.insertMany(discounts, { ordered: false });
  const created = await Discount.find({}).lean();
  console.log(`[Seeder] Discounts seeded: ${created.length}`);
  return created;
}

/**
 * Seed all required collections in dependency order.
 * @param {typeof DEFAULTS} counts
 */
export async function importData(counts = DEFAULTS) {
  console.log("[Seeder] Clearing existing seeded collections...");
  await destroyData();

  console.log(
    "[Seeder] Starting import: Settings -> Filters -> Categories -> Brands -> Shipping -> Users -> VariantCatalog -> Products -> Discounts -> Banners -> Coupons -> Orders -> Reviews",
  );

  await seedSettings();
  await seedFilters();
  const categories = await seedCategories(counts.categories);
  const brands = await seedBrands(counts.brands);
  await seedShipping();
  const users = await seedUsers(counts.users);
  const variantCatalog = await ensureVariantCatalog();
  const products = await seedProducts(
    counts.products,
    categories,
    brands,
    variantCatalog,
  );
  await seedDiscounts(counts.discounts, categories, products);
  await seedBanners(counts.banners, categories);
  await seedCoupons(counts.coupons);
  const orders = await seedOrders(counts.orders, users, products);
  await seedReviews(counts.reviews, users, products, orders);

  console.log("[Seeder] Import complete");
}

/**
 * Run seeder from CLI.
 * @param {string[]} args
 */
export async function runCli(args = process.argv.slice(2)) {
  const { mode, counts } = parseCliArgs(args);

  try {
    await connectDatabase();
    if (mode === "destroy") {
      await destroyData();
    } else {
      await importData(counts);
    }
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error("[Seeder] Failed:", error.message);
    await disconnectDatabase();
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("seeder.js")) {
  runCli();
}
