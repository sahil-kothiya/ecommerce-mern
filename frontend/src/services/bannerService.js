import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const BASE = API_CONFIG.ENDPOINTS.BANNERS;

const bannerService = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  getById(id) {
    return apiClient.get(`${BASE}/${id}`);
  },

  getDiscountOptions() {
    return apiClient.get(`${BASE}/discount-options`);
  },

  getAnalytics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}/analytics${qs ? `?${qs}` : ""}`);
  },

  create(formData) {
    return apiClient.upload(BASE, formData);
  },

  update(id, formData) {
    return apiClient.upload(`${BASE}/${id}`, formData);
  },

  delete(id) {
    return apiClient.delete(`${BASE}/${id}`);
  },

  trackView(id) {
    return apiClient.post(`${BASE}/${id}/view`);
  },

  trackClick(id) {
    return apiClient.post(`${BASE}/${id}/click`);
  },
};

export default bannerService;
