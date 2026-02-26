import { afterEach, beforeAll, describe, expect, jest, test } from "@jest/globals";

const constructEventMock = jest.fn();
const stripeConstructorMock = jest.fn(() => ({
  webhooks: {
    constructEvent: constructEventMock,
  },
}));

await jest.unstable_mockModule("stripe", () => ({
  default: stripeConstructorMock,
}));

const { handleStripeWebhook } = await import("./src/routes/payment.routes.js");
const { Setting } = await import("./src/models/Setting.js");
const { Order } = await import("./src/models/Order.js");
const { config } = await import("./src/config/index.js");

const createResponseMock = () => {
  const response = {};
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

const mockSettings = (settings) => {
  jest.spyOn(Setting, "findOne").mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(settings),
    }),
  }));
};

describe("Stripe webhook security", () => {
  beforeAll(() => {
    config.nodeEnv = "test";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    constructEventMock.mockReset();
    stripeConstructorMock.mockClear();
    config.nodeEnv = "test";
  });

  test("returns 503 when webhook secret is missing in non-local environment", async () => {
    config.nodeEnv = "production";
    mockSettings({
      stripeSecretKey: "sk_test_key",
      stripeWebhookSecret: "",
    });
    const updateSpy = jest.spyOn(Order, "updateOne").mockResolvedValue({});
    const req = {
      headers: {},
      body: Buffer.from("{}"),
    };
    const res = createResponseMock();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/webhook secret is required/i),
      }),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test("returns 400 when signature header is missing but webhook secret is configured", async () => {
    config.nodeEnv = "production";
    mockSettings({
      stripeSecretKey: "sk_test_key",
      stripeWebhookSecret: "whsec_test",
    });
    const updateSpy = jest.spyOn(Order, "updateOne").mockResolvedValue({});
    const req = {
      headers: {},
      body: Buffer.from("{}"),
    };
    const res = createResponseMock();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/missing stripe signature/i),
      }),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test("returns 400 when signature verification fails", async () => {
    config.nodeEnv = "production";
    mockSettings({
      stripeSecretKey: "sk_test_key",
      stripeWebhookSecret: "whsec_test",
    });
    const updateSpy = jest.spyOn(Order, "updateOne").mockResolvedValue({});
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const req = {
      headers: { "stripe-signature": "sig_test" },
      body: Buffer.from("{}"),
    };
    const res = createResponseMock();

    await handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/signature error/i),
      }),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test("processes valid signed webhook and marks order as paid", async () => {
    config.nodeEnv = "production";
    mockSettings({
      stripeSecretKey: "sk_test_key",
      stripeWebhookSecret: "whsec_test",
    });
    const updateSpy = jest.spyOn(Order, "updateOne").mockResolvedValue({});
    constructEventMock.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_123" } },
    });

    const req = {
      headers: { "stripe-signature": "sig_valid" },
      body: Buffer.from("{}"),
    };
    const res = createResponseMock();

    await handleStripeWebhook(req, res);

    expect(updateSpy).toHaveBeenCalledWith(
      { transactionId: "pi_123" },
      { $set: { paymentStatus: "paid" } },
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
