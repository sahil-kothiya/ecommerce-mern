import { Router } from "express";
import { CategoryController } from "../controllers/CategoryController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  createDynamicUpload,
  handleDynamicUploadError,
} from "../middleware/dynamicUpload.js";
import {
  validate,
  categoryQueryValidator,
  categoryIdValidator,
  createCategoryValidator,
  updateCategoryValidator,
} from "../validators/index.js";

const router = Router();
const categoryController = new CategoryController();

router.get("/", categoryQueryValidator, validate, (req, res, next) =>
  categoryController.index(req, res, next),
);

router.get("/tree", (req, res, next) =>
  categoryController.tree(req, res, next),
);

router.get("/flat", (req, res, next) =>
  categoryController.flat(req, res, next),
);

router.get("/filters", (req, res, next) =>
  categoryController.filters(req, res, next),
);

router.get("/navigation", (req, res, next) =>
  categoryController.navigation(req, res, next),
);

router.get("/slug/:slug", (req, res, next) =>
  categoryController.showBySlug(req, res, next),
);

router.get("/:id", categoryIdValidator, validate, (req, res, next) =>
  categoryController.show(req, res, next),
);

router.get("/:id/breadcrumb", categoryIdValidator, validate, (req, res, next) =>
  categoryController.breadcrumb(req, res, next),
);

router.get("/:id/products", categoryIdValidator, validate, (req, res, next) =>
  categoryController.products(req, res, next),
);

router.get("/:id/brands", categoryIdValidator, validate, (req, res, next) =>
  categoryController.brands(req, res, next),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  createDynamicUpload("category", { type: "single", fieldName: "photo" }),
  handleDynamicUploadError,
  createCategoryValidator,
  validate,
  (req, res, next) => categoryController.store(req, res, next),
);

router.post("/reorder", protect, authorize("admin"), (req, res, next) =>
  categoryController.bulkReorder(req, res, next),
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  createDynamicUpload("category", { type: "single", fieldName: "photo" }),
  handleDynamicUploadError,
  updateCategoryValidator,
  validate,
  (req, res, next) => categoryController.update(req, res, next),
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  categoryIdValidator,
  validate,
  (req, res, next) => categoryController.destroy(req, res, next),
);

export default router;
