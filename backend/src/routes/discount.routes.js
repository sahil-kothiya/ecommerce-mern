import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { discountController } from "../controllers/DiscountController.js";
import {
  validate,
  discountQueryValidator,
  discountIdValidator,
  createDiscountValidator,
  updateDiscountValidator,
} from "../validators/index.js";

const router = Router();

router.get(
  "/",
  protect,
  authorize("admin"),
  discountQueryValidator,
  validate,
  discountController.index.bind(discountController),
);
router.get(
  "/form-options",
  protect,
  authorize("admin"),
  discountController.getFormOptions.bind(discountController),
);
router.get(
  "/:id",
  protect,
  authorize("admin"),
  discountIdValidator,
  validate,
  discountController.show.bind(discountController),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  createDiscountValidator,
  validate,
  discountController.create.bind(discountController),
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateDiscountValidator,
  validate,
  discountController.update.bind(discountController),
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  discountIdValidator,
  validate,
  discountController.destroy.bind(discountController),
);

export default router;
