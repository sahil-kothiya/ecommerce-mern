import { Router } from "express";
import { BrandController } from "../controllers/BrandController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  uploadBrandMultiField,
  handleUploadError,
} from "../middleware/uploadEnhanced.js";
import {
  createBrandValidator,
  updateBrandValidator,
  deleteBrandValidator,
  getBrandValidator,
  validate,
} from "../validators/index.js";

const router = Router();
const brandController = new BrandController();

// ============================================================================
// PUBLIC ROUTES - No authentication required
// ============================================================================

// GET /api/brands - List all brands with pagination and filters
router.get("/", (req, res, next) => brandController.index(req, res, next));

// GET /api/brands/:slug - Get single brand by slug or ID
router.get("/:slug", getBrandValidator, validate, (req, res, next) =>
  brandController.show(req, res, next),
);

// GET /api/brands/:slug/products - Get products by brand
router.get("/:slug/products", getBrandValidator, validate, (req, res, next) =>
  brandController.getProducts(req, res, next),
);

// ============================================================================
// PROTECTED ROUTES - Admin only
// ============================================================================

// POST /api/brands - Create new brand
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadBrandMultiField,
  handleUploadError,
  createBrandValidator,
  validate,
  (req, res, next) => brandController.store(req, res, next),
);

// PUT /api/brands/:id - Update existing brand
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadBrandMultiField,
  handleUploadError,
  updateBrandValidator,
  validate,
  (req, res, next) => brandController.update(req, res, next),
);

// DELETE /api/brands/:id - Delete brand (only if no products using it)
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteBrandValidator,
  validate,
  (req, res, next) => brandController.destroy(req, res, next),
);

export default router;
