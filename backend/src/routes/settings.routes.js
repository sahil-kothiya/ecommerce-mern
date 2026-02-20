import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { settingController } from "../controllers/SettingController.js";
import {
  uploadSettingsAssets,
  handleUploadError,
} from "../middleware/uploadEnhanced.js";

const router = Router();

router.get("/public", settingController.publicSettings.bind(settingController));
router.get(
  "/",
  protect,
  authorize("admin"),
  settingController.index.bind(settingController),
);
router.put(
  "/",
  protect,
  authorize("admin"),
  uploadSettingsAssets,
  handleUploadError,
  settingController.update.bind(settingController),
);
router.post(
  "/test-email",
  protect,
  authorize("admin"),
  settingController.testEmail.bind(settingController),
);

export default router;
