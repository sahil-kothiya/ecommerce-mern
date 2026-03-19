import { BannerService } from "../services/BannerService.js";
import { asyncHandler, ApiResponse } from '../utils/AppError.js';

const service = new BannerService();

export class BannerController {
  index = asyncHandler(async (req, res) => {
    const result = await service.listBanners(req.query);
    ApiResponse.success(res, result);
  });

  getDiscountOptions = asyncHandler(async (req, res) => {
    const data = await service.getDiscountOptions();
    ApiResponse.success(res, data);
  });

  show = asyncHandler(async (req, res) => {
    const data = await service.getBannerById(req.params.id);
    ApiResponse.success(res, data);
  });

  create = asyncHandler(async (req, res) => {
    const banner = await service.createBanner(req.body, req.file);
    ApiResponse.created(res, banner, "Banner created successfully");
  });

  update = asyncHandler(async (req, res) => {
    const banner = await service.updateBanner(req.params.id, req.body, req.file);
    ApiResponse.success(res, banner, "Banner updated successfully");
  });

  destroy = asyncHandler(async (req, res) => {
    await service.deleteBanner(req.params.id);
    ApiResponse.success(res, null, "Banner deleted successfully");
  });

  trackView = asyncHandler(async (req, res) => {
    await service.trackView(req.params.id);
    ApiResponse.success(res, null, "View tracked");
  });

  trackClick = asyncHandler(async (req, res) => {
    await service.trackClick(req.params.id);
    ApiResponse.success(res, null, "Click tracked");
  });

  getAnalytics = asyncHandler(async (req, res) => {
    const data = await service.getAnalytics(req.query);
    ApiResponse.success(res, data);
  });
}

export const bannerController = new BannerController();
