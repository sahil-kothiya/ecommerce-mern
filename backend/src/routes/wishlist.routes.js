import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { wishlistController } from "../controllers/WishlistController.js";

const router = Router();

router.use(protect);

router.get("/", wishlistController.index);
router.post("/", wishlistController.addItem);
router.delete("/:id", wishlistController.removeItem);
router.post("/:id/move-to-cart", wishlistController.moveToCart);
router.delete("/", wishlistController.clear);

export default router;
