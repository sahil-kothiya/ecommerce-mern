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

router.get("/", (req, res, next) => brandController.index(req, res, next));

router.get("/:slug", getBrandValidator, validate, (req, res, next) =>
  brandController.show(req, res, next),
);

router.get("/:slug/products", getBrandValidator, validate, (req, res, next) =>
  brandController.getProducts(req, res, next),
);

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

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteBrandValidator,
  validate,
  (req, res, next) => brandController.destroy(req, res, next),
);

export default router;
