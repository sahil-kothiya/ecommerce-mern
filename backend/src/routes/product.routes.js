import { Router } from "express";
import { ProductController } from "../controllers/ProductController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";
import {
  uploadProductAnyField,
  handleUploadError,
} from "../middleware/uploadEnhanced.js";

const router = Router();
const productController = new ProductController();

router.get("/", optionalAuth, (req, res) => productController.index(req, res));

router.get("/featured", (req, res) => productController.featured(req, res));

router.get("/search", (req, res) => productController.search(req, res));

// Admin: get any product by ID (no status filter, includes draft/inactive)
router.get("/admin/:id", protect, authorize("admin"), (req, res) =>
  productController.adminShow(req, res),
);

router.get("/:slug", optionalAuth, (req, res) =>
  productController.show(req, res),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  uploadProductAnyField,
  handleUploadError,
  (req, res) => productController.store(req, res),
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadProductAnyField,
  handleUploadError,
  (req, res) => productController.update(req, res),
);

router.delete("/:id", protect, authorize("admin"), (req, res) =>
  productController.destroy(req, res),
);

export default router;
