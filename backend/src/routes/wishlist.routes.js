import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { wishlistController } from "../controllers/WishlistController.js";
import {
  validate,
  addToWishlistValidator,
  wishlistItemIdValidator,
} from "../validators/index.js";

const router = Router();

router.use(protect);

router.get("/", wishlistController.index);
router.post("/", addToWishlistValidator, validate, wishlistController.addItem);
router.delete(
  "/:id",
  wishlistItemIdValidator,
  validate,
  wishlistController.removeItem,
);
router.post(
  "/:id/move-to-cart",
  wishlistItemIdValidator,
  validate,
  wishlistController.moveToCart,
);
router.delete("/", wishlistController.clear);

export default router;
