import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { variantTypeController } from "../controllers/VariantTypeController.js";
import {
  validate,
  variantTypeIdValidator,
  createVariantTypeValidator,
  updateVariantTypeValidator,
} from "../validators/index.js";

const router = Router();

router.get(
  "/active",
  variantTypeController.listActive.bind(variantTypeController),
);
router.get("/", variantTypeController.index.bind(variantTypeController));
router.get(
  "/:id",
  variantTypeIdValidator,
  validate,
  variantTypeController.show.bind(variantTypeController),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  createVariantTypeValidator,
  validate,
  variantTypeController.create.bind(variantTypeController),
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateVariantTypeValidator,
  validate,
  variantTypeController.update.bind(variantTypeController),
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  variantTypeIdValidator,
  validate,
  variantTypeController.destroy.bind(variantTypeController),
);

export default router;
