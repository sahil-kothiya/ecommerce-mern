import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const BASE = API_CONFIG.ENDPOINTS.CART;

const cartService = {
  get() {
    return apiClient.get(BASE);
  },

  addItem(productId, variantId = null, quantity = 1) {
    return apiClient.post(BASE, { productId, variantId, quantity });
  },

  updateItem(itemId, quantity) {
    return apiClient.put(`${BASE}/${itemId}`, { quantity });
  },

  removeItem(itemId) {
    return apiClient.delete(`${BASE}/${itemId}`);
  },

  clear() {
    return apiClient.delete(BASE);
  },

  applyCoupon(code) {
    return apiClient.post(`${BASE}/coupon`, { code });
  },

  removeCoupon() {
    return apiClient.delete(`${BASE}/coupon`);
  },
};

export default cartService;
