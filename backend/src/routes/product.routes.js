import { Router } from "express";
import { ProductController } from "../controllers/ProductController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";
import {
  uploadProductAnyField,
  handleUploadError,
} from "../middleware/uploadEnhanced.js";

const router = Router();
const productController = new ProductController();

router.get("/", optionalAuth, (req, res, next) =>
  productController.index(req, res, next),
);

router.get("/featured", (req, res, next) =>
  productController.featured(req, res, next),
);

router.get("/search", (req, res, next) =>
  productController.search(req, res, next),
);

router.get("/admin/:id", protect, authorize("admin"), (req, res, next) =>
  productController.adminShow(req, res, next),
);

router.get("/:slug", optionalAuth, (req, res, next) =>
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
