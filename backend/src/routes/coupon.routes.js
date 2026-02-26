import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { couponController } from "../controllers/CouponController.js";
import {
  couponQueryValidator,
  couponIdValidator,
  createCouponValidator,
  updateCouponValidator,
  validateCouponCodeValidator,
  validate,
} from "../validators/index.js";

const router = Router();

router.post(
  "/validate",
  rateLimiter,
  validateCouponCodeValidator,
  validate,
  couponController.validate.bind(couponController),
);

router.get(
  "/",
  protect,
  authorize("admin"),
  couponQueryValidator,
  validate,
  couponController.index.bind(couponController),
);
router.get(
  "/:id",
  protect,
  authorize("admin"),
  couponIdValidator,
  validate,
  couponController.show.bind(couponController),
);

router.post(
  "/",
  protect,
  authorize("admin"),
  createCouponValidator,
  validate,
  couponController.create.bind(couponController),
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateCouponValidator,
  validate,
  couponController.update.bind(couponController),
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  couponIdValidator,
  validate,
  couponController.destroy.bind(couponController),
);

export default router;
