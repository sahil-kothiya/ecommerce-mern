import { Router } from "express";
import { ProductController } from "../controllers/ProductController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
const productController = new ProductController();

router.get("/", protect, authorize("admin"), (req, res) =>
  productController.index(req, res),
);

export default router;

