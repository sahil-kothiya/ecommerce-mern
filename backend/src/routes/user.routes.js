import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { userController } from "../controllers/UserController.js";
import {
  createDynamicUpload,
  handleDynamicUploadError,
} from "../middleware/dynamicUpload.js";
import {
  validate,
  userQueryValidator,
  userIdValidator,
  createUserValidator,
  updateUserValidator,
} from "../validators/index.js";

const router = Router();

router.use(protect);
router.use(authorize("admin"));

router.get(
  "/",
  userQueryValidator,
  validate,
  userController.index.bind(userController),
);
router.get(
  "/:id",
  userIdValidator,
  validate,
  userController.show.bind(userController),
);
router.post(
  "/",
  createDynamicUpload("avatar", { type: "single", fieldName: "avatar" }),
  handleDynamicUploadError,
  createUserValidator,
  validate,
  userController.create.bind(userController),
);
router.put(
  "/:id",
  createDynamicUpload("avatar", { type: "single", fieldName: "avatar" }),
  handleDynamicUploadError,
  updateUserValidator,
  validate,
  userController.update.bind(userController),
);
router.delete(
  "/:id",
  userIdValidator,
  validate,
  userController.destroy.bind(userController),
);

export default router;
