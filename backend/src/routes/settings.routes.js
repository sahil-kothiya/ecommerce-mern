import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { settingController } from "../controllers/SettingController.js";
import {
  createDynamicUpload,
  handleDynamicUploadError,
} from "../middleware/dynamicUpload.js";
import {
  validate,
  updateSettingsValidator,
  testEmailValidator,
} from "../validators/index.js";

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
  createDynamicUpload("settings", {
    type: "fields",
    fields: [
      { name: "logo", maxCount: 1 },
      { name: "favicon", maxCount: 1 },
    ],
  }),
  handleDynamicUploadError,
  updateSettingsValidator,
  validate,
  settingController.update.bind(settingController),
);
router.post(
  "/test-email",
  protect,
  authorize("admin"),
  testEmailValidator,
  validate,
  settingController.testEmail.bind(settingController),
);

router.get(
  "/image",
  settingController.getImageSettings.bind(settingController),
);
router.put(
  "/image",
  protect,
  authorize("admin"),
  settingController.updateImageSettings.bind(settingController),
);
router.post(
  "/image/reset",
  protect,
  authorize("admin"),
  settingController.resetImageSettings.bind(settingController),
);
router.get(
  "/image/section/:sectionName",
  settingController.getImageSectionSettings.bind(settingController),
);
router.put(
  "/image/section/:sectionName",
  protect,
  authorize("admin"),
  settingController.updateImageSectionSettings.bind(settingController),
);

export default router;
