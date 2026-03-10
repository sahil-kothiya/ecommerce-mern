import { API_CONFIG } from "../constants";
import { apiClient } from "./apiClient.js";

class PaymentService {
  async getConfig() {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.PAYMENTS}/config`,
    );
    return response?.data;
  }

  async createPaymentIntent(idempotencyKey = "") {
    const headers = {};
    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.PAYMENTS}/create-intent`,
      {},
      { headers },
    );
    return response?.data;
  }
}

export const paymentService = new PaymentService();
export default paymentService;
