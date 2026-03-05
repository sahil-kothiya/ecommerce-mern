import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const BASE = API_CONFIG.ENDPOINTS.WISHLIST;

const wishlistService = {
  get() {
    return apiClient.get(BASE);
  },

  toggle(productId) {
    return apiClient.post(`${BASE}/toggle`, { productId });
  },

  add(productId) {
    return apiClient.post(BASE, { productId });
  },

  remove(productId) {
    return apiClient.delete(`${BASE}/${productId}`);
  },

  check(productId) {
    return apiClient.get(`${BASE}/check/${productId}`);
  },
};

export default wishlistService;
