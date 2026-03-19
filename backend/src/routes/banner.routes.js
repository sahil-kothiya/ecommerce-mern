import express from "express";
import { BannerController } from "../controllers/BannerController.js";
import {
  createDynamicUpload,
  handleDynamicUploadError,
} from "../middleware/dynamicUpload.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  validate,
  bannerIdValidator,
  createBannerValidator,
  updateBannerValidator,
} from "../validators/index.js";

const router = express.Router();
const bannerController = new BannerController();

router.get("/", bannerController.index.bind(bannerController));

router.get(
  "/discount-options",
  protect,
  authorize("admin"),
  bannerController.getDiscountOptions.bind(bannerController),
);

router.get(
  "/analytics",
  protect,
  authorize("admin"),
  bannerController.getAnalytics.bind(bannerController),
);

router.get(
  "/:id",
  bannerIdValidator,
  validate,
  bannerController.show.bind(bannerController),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  createDynamicUpload("banner", { type: "single", fieldName: "image" }),
  handleDynamicUploadError,
  createBannerValidator,
  validate,
  bannerController.create.bind(bannerController),
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  createDynamicUpload("banner", { type: "single", fieldName: "image" }),
  handleDynamicUploadError,
  updateBannerValidator,
  validate,
  bannerController.update.bind(bannerController),
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  bannerIdValidator,
  validate,
  bannerController.destroy.bind(bannerController),
);

router.post(
  "/:id/view",
  bannerIdValidator,
  validate,
  bannerController.trackView.bind(bannerController),
);

router.post(
  "/:id/click",
  bannerIdValidator,
  validate,
  bannerController.trackClick.bind(bannerController),
);

export default router;
