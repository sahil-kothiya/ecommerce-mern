import { ReviewService } from "../services/ReviewService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const reviewService = new ReviewService();

export class ReviewController {
  getMine = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const data = await reviewService.getMyReviews(req.user._id, { page, limit });
    res.json({ success: true, data });
  });

  index = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const { status, productId, rating, search } = req.query;
    const data = await reviewService.listReviews({ page, limit, status, productId, rating, search });
    res.json({ success: true, data });
  });

  getProductReviews = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const sort = req.query.sort || "recent";
    const data = await reviewService.getProductReviewsPaginated(req.params.productId, { page, limit, sort });
    res.json({ success: true, data: data.reviews, pagination: data.pagination });
  });

  canReview = asyncHandler(async (req, res) => {
    const data = await reviewService.checkEligibility(req.user._id, req.params.productId, req.user?.role);
    res.json({ success: true, data });
  });

  create = asyncHandler(async (req, res) => {
    const data = await reviewService.createReview(req.user._id, req.body);
    res.status(201).json({ success: true, message: "Review created successfully", data });
  });

  update = asyncHandler(async (req, res) => {
    const data = await reviewService.updateReview(req.user._id, req.params.id, req.body);
    res.json({ success: true, message: "Review updated successfully", data });
  });

  destroy = asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    await reviewService.deleteReview(req.user._id, req.params.id, isAdmin);
    res.json({ success: true, message: "Review deleted successfully" });
  });

  markHelpful = asyncHandler(async (req, res) => {
    const result = await reviewService.toggleHelpful(req.params.id, req.user._id, req.user?.role);
    res.json({ success: true, message: result.message, data: { helpful: result.helpful, voted: result.voted } });
  });

  updateStatus = asyncHandler(async (req, res) => {
    const data = await reviewService.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, message: "Review status updated successfully", data });
  });
}

export const reviewController = new ReviewController();
