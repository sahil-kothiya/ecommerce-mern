#!/usr/bin/env node

import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";
import { faker } from "@faker-js/faker";
import { Category } from "./src/models/Category.js";
import { Brand } from "./src/models/Brand.js";
import { User } from "./src/models/User.js";
import { Product } from "./src/models/Product.js";
import { Order } from "./src/models/Order.js";
import { Review } from "./src/models/Review.js";
import { VariantType } from "./src/models/VariantType.js";
import { VariantOption } from "./src/models/VariantOption.js";

dotenv.config();

const DEFAULTS = Object.freeze({
  categories: 16,
  brands: 12,
  users: 36,
  products: 200,
  orders: 120,
  reviews: 180,
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
    Product.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
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

function buildProductTitleForCategory(categoryTitle) {
  const normalized = String(categoryTitle || "").toLowerCase();
  const adjective = faker.commerce.productAdjective();

  if (normalized.includes("mobile") || normalized.includes("phone")) {
    return `${adjective} Smartphone`;
  }
  if (normalized.includes("television") || normalized.includes("tv")) {
    return `${adjective} Smart TV`;
  }
  if (normalized.includes("laptop")) {
    return `${adjective} Laptop`;
  }
  if (normalized.includes("tablet")) {
    return `${adjective} Tablet`;
  }
  if (normalized.includes("watch")) {
    return `${adjective} Smart Watch`;
  }
  if (normalized.includes("headphone")) {
    return `${adjective} Headphones`;
  }
  if (normalized.includes("camera")) {
    return `${adjective} Camera`;
  }
  if (normalized.includes("gaming") || normalized.includes("console")) {
    return `${adjective} Gaming Console`;
  }
  if (normalized.includes("kitchen") || normalized.includes("appliance")) {
    return `${adjective} Kitchen Appliance`;
  }
  if (normalized.includes("shoe")) {
    return `${adjective} Shoes`;
  }
  if (normalized.includes("clothing")) {
    return `${adjective} Apparel`;
  }
  if (normalized.includes("furniture")) {
    return `${adjective} Furniture`;
  }
  if (normalized.includes("beauty")) {
    return `${adjective} Beauty Product`;
  }
  if (normalized.includes("book")) {
    return `${adjective} Book`;
  }
  if (normalized.includes("sports")) {
    return `${adjective} Sports Gear`;
  }

  return `${adjective} ${faker.commerce.product()}`;
}

function buildProductImages(slug) {
  const first = `https://picsum.photos/seed/${slug}-1/900/900`;
  const second = `https://picsum.photos/seed/${slug}-2/900/900`;
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
      path: `https://picsum.photos/seed/${seed}-variant-1/900/900`,
      altText: `${seed} variant image`,
      isPrimary: true,
      sortOrder: 0,
    },
    {
      path: `https://picsum.photos/seed/${seed}-variant-2/900/900`,
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

  const typeByName = {};
  for (const [index, requiredType] of requiredTypes.entries()) {
    let typeDoc = await VariantType.findOne({ name: requiredType.name });
    if (!typeDoc) {
      typeDoc = await VariantType.create({
        ...requiredType,
        status: STATUS_ACTIVE,
        sortOrder: index + 1,
      });
    } else if (typeDoc.status !== STATUS_ACTIVE) {
      typeDoc.status = STATUS_ACTIVE;
      await typeDoc.save();
    }
    typeByName[requiredType.name] = typeDoc;
  }

  const optionsByType = {};
  for (const requiredType of requiredTypes) {
    const typeDoc = typeByName[requiredType.name];
    const requiredOptions = requiredOptionsByType[requiredType.name] || [];

    for (const [index, option] of requiredOptions.entries()) {
      let optionDoc = await VariantOption.findOne({
        variantTypeId: typeDoc._id,
        value: option.value,
      });
      if (!optionDoc) {
        optionDoc = await VariantOption.create({
          variantTypeId: typeDoc._id,
          value: option.value,
          displayValue: option.displayValue,
          hexColor: option.hexColor || null,
          status: STATUS_ACTIVE,
          sortOrder: index + 1,
        });
      } else if (optionDoc.status !== STATUS_ACTIVE) {
        optionDoc.status = STATUS_ACTIVE;
        await optionDoc.save();
      }
    }

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

  return {
    types: typeByName,
    options: optionsByType,
  };
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
      logo: `https://picsum.photos/seed/brand-${slug}/300/300`,
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
  const products = [];

  for (let index = 0; index < count; index += 1) {
    const category = faker.helpers.arrayElement(categories);
    const brand = faker.helpers.arrayElement(brands);
    const title = buildProductTitleForCategory(category.title);
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

    products.push(productDoc);
  }

  await Product.insertMany(products, { ordered: false });
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
      paymentStatus: faker.helpers.arrayElement(["paid", "unpaid"]),
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

  while (reviews.length < count) {
    const user = faker.helpers.arrayElement(users);
    const product = faker.helpers.arrayElement(products);
    const pairKey = `${user._id.toString()}:${product._id.toString()}`;
    if (pairSet.has(pairKey)) continue;
    pairSet.add(pairKey);

    const relatedOrder = faker.helpers.arrayElement(orders);
    reviews.push({
      productId: product._id,
      userId: user._id,
      orderId: relatedOrder?._id || null,
      rating: faker.number.int({ min: 3, max: 5 }),
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      comment: faker.lorem.paragraph({ min: 1, max: 2 }),
      status: STATUS_ACTIVE,
      helpful: faker.number.int({ min: 0, max: 50 }),
    });
  }

  await Review.insertMany(reviews, { ordered: false });
  const created = await Review.find({ status: STATUS_ACTIVE }).lean();
  console.log(`[Seeder] Reviews seeded: ${created.length}`);
}

/**
 * Seed all required collections in dependency order.
 * @param {typeof DEFAULTS} counts
 */
export async function importData(counts = DEFAULTS) {
  console.log("[Seeder] Clearing existing seeded collections...");
  await destroyData();

  console.log(
    "[Seeder] Starting import order: Categories -> Users -> Products -> Orders -> Reviews",
  );
  const categories = await seedCategories(counts.categories);
  const brands = await seedBrands(counts.brands);
  const users = await seedUsers(counts.users);
  const variantCatalog = await ensureVariantCatalog();
  const products = await seedProducts(
    counts.products,
    categories,
    brands,
    variantCatalog,
  );
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
