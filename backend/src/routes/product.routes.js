import { Router } from "express";
import { ProductController } from "../controllers/ProductController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";
import {
  uploadProductAnyField,
  handleUploadError,
} from "../middleware/uploadEnhanced.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router = Router();
const productController = new ProductController();

// 30s cache — product listings change frequently
router.get("/", optionalAuth, cacheMiddleware(30), (req, res, next) =>
  productController.index(req, res, next),
);

// 120s cache — featured list is rarely updated
router.get("/featured", cacheMiddleware(120), (req, res, next) =>
  productController.featured(req, res, next),
);

// 30s cache — search results
router.get("/search", cacheMiddleware(30), (req, res, next) =>
  productController.search(req, res, next),
);

router.get("/admin/:id", protect, authorize("admin"), (req, res, next) =>
  productController.adminShow(req, res, next),
);

// 60s cache — individual product pages
router.get("/:slug", optionalAuth, cacheMiddleware(60), (req, res, next) =>
  productController.show(req, res, next),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  uploadProductAnyField,
  handleUploadError,
  (req, res, next) => productController.store(req, res, next),
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadProductAnyField,
  handleUploadError,
  (req, res, next) => productController.update(req, res, next),
);

router.delete("/:id", protect, authorize("admin"), (req, res, next) =>
  productController.destroy(req, res, next),
);

export default router;
