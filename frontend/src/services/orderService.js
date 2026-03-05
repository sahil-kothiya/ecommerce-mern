import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const BASE = API_CONFIG.ENDPOINTS.ORDERS;

const orderService = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  getById(id) {
    return apiClient.get(`${BASE}/${id}`);
  },

  getMine(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}/mine${qs ? `?${qs}` : ""}`);
  },

  create(orderData) {
    return apiClient.post(BASE, orderData);
  },

  updateStatus(id, status) {
    return apiClient.put(`${BASE}/${id}/status`, { status });
  },

  cancel(id) {
    return apiClient.put(`${BASE}/${id}/cancel`);
  },
};

export default orderService;
