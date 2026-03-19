import { Router } from "express";
import { ProductController } from "../controllers/ProductController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";
import {
  createDynamicUpload,
  handleDynamicUploadError,
} from "../middleware/dynamicUpload.js";
import { cacheMiddleware } from "../middleware/cache.js";
import {
  validate,
  productQueryValidator,
  productIdValidator,
  createProductValidator,
  updateProductValidator,
} from "../validators/index.js";

const router = Router();
const productController = new ProductController();

router.get(
  "/",
  optionalAuth,
  productQueryValidator,
  validate,
  cacheMiddleware(30),
  (req, res, next) => productController.index(req, res, next),
);

router.get("/featured", cacheMiddleware(120), (req, res, next) =>
  productController.featured(req, res, next),
);

router.get(
  "/search",
  productQueryValidator,
  validate,
  cacheMiddleware(30),
  (req, res, next) => productController.search(req, res, next),
);

router.get(
  "/admin/:id",
  protect,
  authorize("admin"),
  productIdValidator,
  validate,
  (req, res, next) => productController.adminShow(req, res, next),
);

router.get("/:slug", optionalAuth, cacheMiddleware(60), (req, res, next) =>
  productController.show(req, res, next),
);

const extendTimeout = (req, res, next) => {
  req.setTimeout(10 * 60 * 1000);
  res.setTimeout(10 * 60 * 1000);
  next();
};

router.post(
  "/",
  protect,
  authorize("admin"),
  extendTimeout,
  createDynamicUpload("product", { type: "any" }),
  handleDynamicUploadError,
  createProductValidator,
  validate,
  (req, res, next) => productController.store(req, res, next),
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  extendTimeout,
  createDynamicUpload("product", { type: "any" }),
  handleDynamicUploadError,
  updateProductValidator,
  validate,
  (req, res, next) => productController.update(req, res, next),
);

router.post(
  "/:id/images",
  protect,
  authorize("admin"),
  extendTimeout,
  createDynamicUpload("product", { type: "any" }),
  handleDynamicUploadError,
  productIdValidator,
  validate,
  (req, res, next) => productController.appendImages(req, res, next),
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  productIdValidator,
  validate,
  (req, res, next) => productController.destroy(req, res, next),
);

export default router;
