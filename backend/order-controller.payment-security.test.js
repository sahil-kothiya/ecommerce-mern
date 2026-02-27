import {
  afterEach,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const retrievePaymentIntentMock = jest.fn();
const stripeConstructorMock = jest.fn(() => ({
  paymentIntents: {
    retrieve: retrievePaymentIntentMock,
  },
}));

await jest.unstable_mockModule("stripe", () => ({
  default: stripeConstructorMock,
}));

const { OrderController } =
  await import("./src/controllers/OrderController.js");
const { AppError } = await import("./src/middleware/errorHandler.js");
const { Order } = await import("./src/models/Order.js");
const { Cart } = await import("./src/models/Cart.js");
const { Setting } = await import("./src/models/Setting.js");

const createResponseMock = () => {
  const response = {};
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

const createBaseRequest = () => ({
  user: { _id: "u1" },
  headers: {},
  body: {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    phone: "1234567890",
    address1: "123 Test Street",
    city: "Austin",
    postCode: "78701",
    country: "US",
    paymentMethod: "cod",
  },
});

describe("OrderController payment security guards", () => {
  let controller;

  beforeAll(() => {
    controller = new OrderController();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    retrievePaymentIntentMock.mockReset();
    stripeConstructorMock.mockClear();
  });

  test("returns existing order when idempotency key is reused", async () => {
    const existingOrder = { _id: "ord-1", orderNumber: "ORD-001" };
    const req = createBaseRequest();
    req.headers["idempotency-key"] = "idem-123";

    jest.spyOn(Order, "findOne").mockImplementation((filter) => ({
      lean: jest
        .fn()
        .mockResolvedValue(filter.idempotencyKey ? existingOrder : null),
    }));

    const res = createResponseMock();
    const next = jest.fn();

    await controller.store(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: existingOrder,
      }),
    );
  });

  test("blocks Stripe checkout when paid amount does not match cart total", async () => {
    const req = createBaseRequest();
    req.body.paymentMethod = "stripe";
    req.body.paymentIntentId = "pi_mismatch";

    jest.spyOn(Order, "findOne").mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(null),
    }));
    jest.spyOn(Setting, "findOne").mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ stripeSecretKey: "sk_test_123" }),
      }),
    }));
    jest.spyOn(Cart, "find").mockImplementation(() => ({
      lean: jest
        .fn()
        .mockResolvedValue([{ amount: 20, quantity: 1, productId: "p1" }]),
    }));

    retrievePaymentIntentMock.mockResolvedValue({
      status: "succeeded",
      amount_received: 1000,
      amount: 1000,
      currency: "usd",
      metadata: { userId: "u1" },
    });

    const res = createResponseMock();
    const next = jest.fn();

    await controller.store(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/payment amount does not match/i);
  });

  test("blocks reuse of a Stripe payment intent tied to an existing order", async () => {
    const req = createBaseRequest();
    req.body.paymentMethod = "stripe";
    req.body.paymentIntentId = "pi_reused";

    jest.spyOn(Order, "findOne").mockImplementation((filter) => ({
      lean: jest
        .fn()
        .mockResolvedValue(filter.transactionId ? { _id: "ord-dup" } : null),
    }));
    jest.spyOn(Setting, "findOne").mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ stripeSecretKey: "sk_test_123" }),
      }),
    }));
    jest.spyOn(Cart, "find").mockImplementation(() => ({
      lean: jest
        .fn()
        .mockResolvedValue([{ amount: 20, quantity: 1, productId: "p1" }]),
    }));

    retrievePaymentIntentMock.mockResolvedValue({
      status: "succeeded",
      amount_received: 3000,
      amount: 3000,
      currency: "usd",
      metadata: { userId: "u1" },
    });

    const res = createResponseMock();
    const next = jest.fn();

    await controller.store(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/already been used/i);
  });
});
