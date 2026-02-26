#!/usr/bin/env node

import mongoose from "mongoose";
import dotenv from "dotenv";
import { logger } from "../src/utils/logger.js";

dotenv.config();

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const shouldDeactivateExpired = !args.includes("--keep-expired-status");

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

async function connectToDatabase() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/enterprise-ecommerce";
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  logger.info(`Connected to MongoDB (${mongoose.connection.name})`);
}

async function migrateCoupons() {
  const couponsCollection = mongoose.connection.db.collection("coupons");
  const coupons = await couponsCollection.find({}).toArray();

  logger.info(`Found ${coupons.length} coupon(s) to inspect`);

  let updated = 0;
  let skipped = 0;

  for (const coupon of coupons) {
    const minPurchase = toNumber(
      coupon.minPurchase,
      toNumber(coupon.minOrderAmount, 0),
    );
    const usedCount = toNumber(
      coupon.usedCount,
      toNumber(coupon.usageCount, 0),
    );
    const userUsageLimit =
      coupon.userUsageLimit != null
        ? coupon.userUsageLimit
        : coupon.perUserLimit != null
          ? coupon.perUserLimit
          : null;
    const startDate = toDateOrNull(coupon.startDate ?? coupon.validFrom);
    const expiryDate = toDateOrNull(coupon.expiryDate ?? coupon.validUntil);

    let nextStatus = coupon.status;
    if (
      shouldDeactivateExpired &&
      nextStatus === "active" &&
      expiryDate &&
      expiryDate.getTime() < Date.now()
    ) {
      nextStatus = "inactive";
    }

    const setData = {
      minPurchase,
      usedCount,
      status: nextStatus,
      updatedAt: new Date(),
    };

    if (userUsageLimit != null) {
      setData.userUsageLimit = userUsageLimit;
    }

    if (startDate) {
      setData.startDate = startDate;
    }

    if (expiryDate) {
      setData.expiryDate = expiryDate;
    }

    const needsUpdate =
      coupon.minPurchase !== minPurchase ||
      coupon.usedCount !== usedCount ||
      String(coupon.status || "") !== String(nextStatus || "") ||
      Boolean(coupon.minOrderAmount !== undefined) ||
      Boolean(coupon.usageCount !== undefined) ||
      Boolean(coupon.perUserLimit !== undefined) ||
      Boolean(coupon.validFrom !== undefined) ||
      Boolean(coupon.validUntil !== undefined) ||
      (startDate &&
        String(coupon.startDate || "") !== startDate.toISOString()) ||
      (expiryDate &&
        String(coupon.expiryDate || "") !== expiryDate.toISOString());

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    if (!isDryRun) {
      await couponsCollection.updateOne(
        { _id: coupon._id },
        {
          $set: setData,
          $unset: {
            minOrderAmount: "",
            usageCount: "",
            perUserLimit: "",
            validFrom: "",
            validUntil: "",
          },
        },
      );
    }

    updated += 1;
  }

  logger.info(
    `${isDryRun ? "[DRY RUN] " : ""}Coupon migration complete. Updated: ${updated}, Skipped: ${skipped}`,
  );
}

async function main() {
  logger.info("Coupon Canonical Migration");
  logger.info("=".repeat(40));
  logger.info(`Mode: ${isDryRun ? "DRY RUN" : "APPLY CHANGES"}`);

  try {
    await connectToDatabase();
    await migrateCoupons();
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    logger.info("Database connection closed");
  }
}

main();
