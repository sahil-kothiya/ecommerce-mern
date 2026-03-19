import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { variantOptionController } from "../controllers/VariantOptionController.js";
import {
  validate,
  variantOptionIdValidator,
  createVariantOptionValidator,
  updateVariantOptionValidator,
} from "../validators/index.js";

const router = Router();

router.get("/", variantOptionController.index.bind(variantOptionController));
router.get(
  "/:id",
  variantOptionIdValidator,
  validate,
  variantOptionController.show.bind(variantOptionController),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  createVariantOptionValidator,
  validate,
  variantOptionController.create.bind(variantOptionController),
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateVariantOptionValidator,
  validate,
  variantOptionController.update.bind(variantOptionController),
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  variantOptionIdValidator,
  validate,
  variantOptionController.destroy.bind(variantOptionController),
);

export default router;
