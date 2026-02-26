const mongoose = require("mongoose");

describe("CouponController update field sync", () => {
  let CouponController;
  let Coupon;

  beforeAll(async () => {
    const controllerModule =
      await import("./src/controllers/CouponController.js");
    const modelModule = await import("./src/models/Coupon.js");
    CouponController = controllerModule.CouponController;
    Coupon = modelModule.Coupon;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("updates minPurchase and keeps minOrderAmount in sync", async () => {
    const controller = new CouponController();

    const couponDocument = {
      _id: "699d90a72bae7207cb3e7c8d",
      code: "SAVE20",
      type: "percent",
      value: 20,
      minPurchase: 3,
      minOrderAmount: 3,
      maxDiscount: 200,
      usageLimit: 5,
      usedCount: 0,
      usageCount: 0,
      userUsageLimit: 1,
      perUserLimit: 1,
      startDate: null,
      validFrom: null,
      expiryDate: null,
      validUntil: null,
      status: "active",
      description: "",
      toObject: jest.fn(function toObject() {
        return {
          _id: this._id,
          code: this.code,
          type: this.type,
          value: this.value,
          minPurchase: this.minPurchase,
          minOrderAmount: this.minOrderAmount,
          maxDiscount: this.maxDiscount,
          usageLimit: this.usageLimit,
          usedCount: this.usedCount,
          usageCount: this.usageCount,
          userUsageLimit: this.userUsageLimit,
          perUserLimit: this.perUserLimit,
          startDate: this.startDate,
          validFrom: this.validFrom,
          expiryDate: this.expiryDate,
          validUntil: this.validUntil,
          status: this.status,
          description: this.description,
        };
      }),
    };

    couponDocument.save = jest.fn(async function save() {
      this.minOrderAmount = this.minPurchase;
      return this;
    });

    jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(true);
    jest.spyOn(Coupon, "findById").mockResolvedValue(couponDocument);

    const request = {
      params: { id: "699d90a72bae7207cb3e7c8d" },
      body: {
        code: "SAVE20",
        type: "percent",
        value: 20,
        minPurchase: 100,
        maxDiscount: 200,
        usageLimit: 5,
        status: "active",
      },
    };

    const response = {
      json: jest.fn(),
    };

    const next = jest.fn();

    await controller.update(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(couponDocument.save).toHaveBeenCalledTimes(1);
    expect(couponDocument.minPurchase).toBe(100);
    expect(couponDocument.minOrderAmount).toBe(100);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Coupon updated successfully",
        data: expect.objectContaining({
          minPurchase: 100,
          minOrderAmount: 100,
        }),
      }),
    );
  });
});
