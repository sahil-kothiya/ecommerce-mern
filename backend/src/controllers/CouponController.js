import { CouponService } from "../services/CouponService.js";
import { asyncHandler, ApiResponse } from '../utils/AppError.js';

const service = new CouponService();

export class CouponController {
  index = asyncHandler(async (req, res) => {
    const { page, limit, search, status, type } = req.query;
    const result = await service.listCoupons({ page: Number(page) || 1, limit: Number(limit) || 20, search, status, type });
    ApiResponse.paginated(res, result.coupons, result.pagination);
  });

  show = asyncHandler(async (req, res) => {
    const coupon = await service.getCouponById(req.params.id);
    ApiResponse.success(res, coupon);
  });

  create = asyncHandler(async (req, res) => {
    const coupon = await service.createCoupon(req.body);
    ApiResponse.created(res, coupon, "Coupon created successfully");
  });

  update = asyncHandler(async (req, res) => {
    const coupon = await service.updateCoupon(req.params.id, req.body);
    ApiResponse.success(res, coupon, "Coupon updated successfully");
  });

  destroy = asyncHandler(async (req, res) => {
    await service.deleteCoupon(req.params.id);
    ApiResponse.noContent(res);
  });

  validate = asyncHandler(async (req, res) => {
    const { code, orderTotal, cartTotal } = req.body;
    const total = Number(orderTotal || cartTotal || 0);
    const result = await service.validateForOrder(code, total);
    ApiResponse.success(res, result, "Coupon is valid");
  });
}

export const couponController = new CouponController();
