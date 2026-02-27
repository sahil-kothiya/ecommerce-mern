import Stripe from "stripe";
import { Setting } from "../models/Setting.js";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { calculateCartTotals } from "../utils/pricing.js";

export class PaymentService {
  async getStripeClient() {
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
  }

  async getPaymentConfig() {
    const settings = await Setting.findOne({ key: "main" })
      .select("stripePublicKey stripeEnabled")
      .lean();
    return {
      stripeEnabled: Boolean(settings?.stripeEnabled),
      publicKey: settings?.stripePublicKey || "",
    };
  }

  async createPaymentIntent(userId, idempotencyKey) {
    const { stripe } = await this.getStripeClient();

    const cartItems = await Cart.find({ userId }).lean();
    if (!cartItems.length) throw new AppError("Cart is empty", 400);

    const totals = calculateCartTotals(cartItems);
    const intent = await stripe.paymentIntents.create(
      {
        amount: totals.amountInCents,
        currency: "usd",
        metadata: { userId: userId.toString() },
        automatic_payment_methods: { enabled: true },
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    logger.info(
      `Stripe PaymentIntent created: ${intent.id} for user ${userId}, amount: $${totals.totalAmount}`,
    );

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: totals.totalAmount,
    };
  }

  async handleWebhook(rawBody, signature) {
    const settings = await Setting.findOne({ key: "main" })
      .select("stripeSecretKey stripeWebhookSecret")
      .lean();
    if (!settings?.stripeSecretKey) {
      throw new AppError("Stripe not configured", 503);
    }

    const stripe = new Stripe(settings.stripeSecretKey);
    const isLocalEnvironment = ["development", "test", "local"].includes(
      config.nodeEnv,
    );
    let event;

    if (!settings.stripeWebhookSecret) {
      if (!isLocalEnvironment) {
        throw new AppError("Stripe webhook secret is required", 503);
      }
      event = JSON.parse(rawBody.toString());
    } else if (!signature) {
      throw new AppError("Missing Stripe signature header", 400);
    } else {
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          settings.stripeWebhookSecret,
        );
      } catch (err) {
        logger.warn(
          `Stripe webhook signature verification failed: ${err.message}`,
        );
        throw new AppError(`Webhook signature error: ${err.message}`, 400);
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

    return { received: true };
  }
}

export const paymentService = new PaymentService();
