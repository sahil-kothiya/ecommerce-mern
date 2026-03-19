import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { cartController } from "../controllers/CartController.js";
import {
  validate,
  addToCartValidator,
  updateCartItemValidator,
  cartItemIdValidator,
} from "../validators/index.js";

const router = Router();

router.use(protect);

router.get("/", cartController.index);
router.post("/", addToCartValidator, validate, cartController.addItem);
router.put(
  "/:id",
  updateCartItemValidator,
  validate,
  cartController.updateItem,
);
router.delete("/:id", cartItemIdValidator, validate, cartController.removeItem);
router.delete("/", cartController.clear);

export default router;
