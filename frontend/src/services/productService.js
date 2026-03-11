import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const BASE = API_CONFIG.ENDPOINTS.PRODUCTS;
const ADMIN = API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS;

const productService = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  getFeatured(limit = 8) {
    return apiClient.get(`${BASE}/featured?limit=${limit}`);
  },

  search(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}/search${qs ? `?${qs}` : ""}`);
  },

  getBySlug(slug) {
    return apiClient.get(`${BASE}/slug/${slug}`);
  },

  getById(id) {
    return apiClient.get(`${BASE}/${id}`);
  },

  adminGetAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${ADMIN}${qs ? `?${qs}` : ""}`);
  },

  adminGetById(id) {
    return apiClient.get(`${ADMIN}/${id}`);
  },

  create(formData) {
    return apiClient.upload(ADMIN, formData);
  },

  update(id, formData) {
    return apiClient.upload(`${ADMIN}/${id}`, formData, undefined, "PUT");
  },

  delete(id) {
    return apiClient.delete(`${ADMIN}/${id}`);
  },
};

export default productService;
