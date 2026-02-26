import { Router } from "express";
import Stripe from "stripe";
import { protect } from "../middleware/auth.js";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Setting } from "../models/Setting.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { calculateCartTotals } from "../utils/pricing.js";

const router = Router();

const getStripeClient = async () => {
  const settings = await Setting.findOne({ key: "main" })
    .select("stripeSecretKey stripeWebhookSecret")
    .lean();
  if (!settings?.stripeSecretKey) {
    throw new AppError(
      "Stripe secret key is not configured. Please add it in admin settings.",
      503,
    );
  }
  return {
    stripe: new Stripe(settings.stripeSecretKey),
    webhookSecret: settings.stripeWebhookSecret,
  };
};

// GET /api/payments/config - public key for frontend (no auth required)
router.get("/config", async (_req, res, next) => {
  try {
    const settings = await Setting.findOne({ key: "main" })
      .select("stripePublicKey stripeEnabled")
      .lean();
    res.json({
      success: true,
      data: {
        stripeEnabled: Boolean(settings?.stripeEnabled),
        publicKey: settings?.stripePublicKey || "",
      },
    });
  } catch (_error) {
    next(new AppError("Failed to get payment config", 500));
  }
});

// POST /api/payments/create-intent - create Stripe PaymentIntent from current cart
router.post("/create-intent", protect, async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { stripe } = await getStripeClient();
    const requestIdempotencyKey = String(
      req.headers["x-idempotency-key"] || "",
    ).trim();

    const cartItems = await Cart.find({ userId }).lean();
    if (!cartItems.length) {
      return next(new AppError("Cart is empty", 400));
    }

    const totals = calculateCartTotals(cartItems);
    const intent = await stripe.paymentIntents.create(
      {
        amount: totals.amountInCents,
        currency: "usd",
        metadata: { userId: userId.toString() },
        automatic_payment_methods: { enabled: true },
      },
      requestIdempotencyKey
        ? { idempotencyKey: requestIdempotencyKey }
        : undefined,
    );

    logger.info(
      `Stripe PaymentIntent created: ${intent.id} for user ${userId}, amount: $${totals.totalAmount}`,
    );

    return res.json({
      success: true,
      data: {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: totals.totalAmount,
      },
    });
  } catch (error) {
    return next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Failed to create payment intent", 500),
    );
  }
});

// POST /api/payments/webhook - Stripe webhook (raw body required, registered in app.js before json middleware)
export const handleStripeWebhook = async (req, res) => {
  let event;
  try {
    const settings = await Setting.findOne({ key: "main" })
      .select("stripeSecretKey stripeWebhookSecret")
      .lean();
    if (!settings?.stripeSecretKey) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const stripe = new Stripe(settings.stripeSecretKey);
    const sig = req.headers["stripe-signature"];
    const isLocalEnvironment = ["development", "test", "local"].includes(
      config.nodeEnv,
    );

    if (!settings.stripeWebhookSecret) {
      if (!isLocalEnvironment) {
        return res
          .status(503)
          .json({ error: "Stripe webhook secret is required" });
      }
      event = JSON.parse(req.body.toString());
    } else if (!sig) {
      return res.status(400).json({ error: "Missing Stripe signature header" });
    } else {
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          settings.stripeWebhookSecret,
        );
      } catch (err) {
        logger.warn(
          `Stripe webhook signature verification failed: ${err.message}`,
        );
        return res
          .status(400)
          .json({ error: `Webhook signature error: ${err.message}` });
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      await Order.updateOne(
        { transactionId: intent.id },
        { $set: { paymentStatus: "paid" } },
      );
      logger.info(`Stripe webhook: Order marked paid for intent ${intent.id}`);
    }

    return res.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

export default router;
