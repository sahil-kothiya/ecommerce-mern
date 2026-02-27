import { apiClient } from "./apiClient.js";
import { API_CONFIG } from "../constants";

class ReviewService {
  async getProductReviews(productId, params = {}) {
    if (!productId) throw new Error("Product ID is required");
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);
    const query = queryParams.toString();
    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.REVIEWS}/product/${productId}${query ? `?${query}` : ""}`,
    );
  }

  async canReview(productId) {
    if (!productId) throw new Error("Product ID is required");
    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.REVIEWS}/can-review/${productId}`,
    );
  }

  async createReview(payload) {
    return apiClient.post(`${API_CONFIG.ENDPOINTS.REVIEWS}`, payload);
  }

  async updateReview(id, payload) {
    return apiClient.put(`${API_CONFIG.ENDPOINTS.REVIEWS}/${id}`, payload);
  }

  async markHelpful(id) {
    return apiClient.put(`${API_CONFIG.ENDPOINTS.REVIEWS}/${id}/helpful`);
  }

  async getMyReviews(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    const query = queryParams.toString();
    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.REVIEWS}/mine${query ? `?${query}` : ""}`,
    );
  }

  async getReviews(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.status) queryParams.append("status", params.status);
    if (params.search) queryParams.append("search", params.search);
    if (params.rating) queryParams.append("rating", params.rating);
    if (params.productId) queryParams.append("productId", params.productId);

    const query = queryParams.toString();
    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.REVIEWS}${query ? `?${query}` : ""}`,
    );
  }

  async updateReviewStatus(id, status) {
    return apiClient.put(`${API_CONFIG.ENDPOINTS.REVIEWS}/${id}/status`, {
      status,
    });
  }

  async deleteReview(id) {
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.REVIEWS}/${id}`);
  }
}

export const reviewService = new ReviewService();
export default reviewService;
