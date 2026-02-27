import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { paymentController } from "../controllers/PaymentController.js";

const router = Router();

router.get("/config", paymentController.getConfig);
router.post("/create-intent", protect, paymentController.createIntent);

export const handleStripeWebhook = paymentController.webhook;

export default router;
