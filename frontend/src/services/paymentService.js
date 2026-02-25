import { API_CONFIG } from "../constants";
import authService from "./authService";

class PaymentService {
  async getConfig() {
    const res = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PAYMENTS}/config`,
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data?.message || "Failed to get payment config");
    return data.data;
  }

  async createPaymentIntent() {
    const res = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PAYMENTS}/create-intent`,
      {
        method: "POST",
        headers: authService.getAuthHeaders(),
        credentials: "include",
      },
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data?.message || "Failed to create payment intent");
    return data.data; // { clientSecret, paymentIntentId, amount }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
