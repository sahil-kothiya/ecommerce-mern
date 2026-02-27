import { BaseController } from "../core/BaseController.js";
import { PaymentService } from "../services/PaymentService.js";
import { logger } from "../utils/logger.js";

class PaymentController extends BaseController {
  constructor() {
    super(new PaymentService());
  }

  getConfig = this.catchAsync(async (_req, res) => {
    const data = await this.service.getPaymentConfig();
    this.sendSuccess(res, data);
  });

  createIntent = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const idempotencyKey = String(
      req.headers["x-idempotency-key"] || "",
    ).trim();
    const data = await this.service.createPaymentIntent(userId, idempotencyKey);
    this.sendSuccess(res, data);
  });

  webhook = async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"];
      const result = await this.service.handleWebhook(req.body, signature);
      return res.json({ success: true, data: result });
    } catch (error) {
      logger.error("Stripe webhook error:", error);
      const status = error.statusCode || 500;
      return res
        .status(status)
        .json({
          success: false,
          message: error.message || "Webhook processing failed",
        });
    }
  };
}

export const paymentController = new PaymentController();
