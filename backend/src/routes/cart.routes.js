import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { cartController } from "../controllers/CartController.js";

const router = Router();

router.use(protect);

router.get("/", cartController.index);
router.post("/", cartController.addItem);
router.put("/:id", cartController.updateItem);
router.delete("/:id", cartController.removeItem);
router.delete("/", cartController.clear);

export default router;
