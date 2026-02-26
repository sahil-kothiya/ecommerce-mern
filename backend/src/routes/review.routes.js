import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { reviewController } from "../controllers/ReviewController.js";
import {
  validate,
  createReviewValidator,
  updateReviewValidator,
  reviewIdValidator,
  reviewStatusValidator,
  productReviewQueryValidator,
  reviewAdminQueryValidator,
} from "../validators/index.js";

const router = Router();

router.get(
  "/product/:productId",
  productReviewQueryValidator,
  validate,
  reviewController.getProductReviews.bind(reviewController),
);

router.post(
  "/",
  protect,
  createReviewValidator,
  validate,
  reviewController.create.bind(reviewController),
);
router.put(
  "/:id",
  protect,
  updateReviewValidator,
  validate,
  reviewController.update.bind(reviewController),
);
router.delete(
  "/:id",
  protect,
  reviewIdValidator,
  validate,
  reviewController.destroy.bind(reviewController),
);

router.get(
  "/mine",
  protect,
  reviewAdminQueryValidator,
  validate,
  reviewController.getMine.bind(reviewController),
);

router.get(
  "/",
  protect,
  authorize("admin"),
  reviewAdminQueryValidator,
  validate,
  reviewController.index.bind(reviewController),
);
router.put(
  "/:id/status",
  protect,
  authorize("admin"),
  reviewStatusValidator,
  validate,
  reviewController.updateStatus.bind(reviewController),
);

export default router;
