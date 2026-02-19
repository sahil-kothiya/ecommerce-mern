import { apiClient } from './apiClient.js';
import { API_CONFIG } from '../constants';

class CouponService {
    async getCoupons(params = {}) {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.type) queryParams.append('type', params.type);
        if (params.status) queryParams.append('status', params.status);

        const query = queryParams.toString();
        return apiClient.get(`${API_CONFIG.ENDPOINTS.COUPONS}${query ? `?${query}` : ''}`);
    }

    async getCouponById(id) {
        return apiClient.get(`${API_CONFIG.ENDPOINTS.COUPONS}/${id}`);
    }

    async createCoupon(payload) {
        return apiClient.post(API_CONFIG.ENDPOINTS.COUPONS, payload);
    }

    async updateCoupon(id, payload) {
        return apiClient.put(`${API_CONFIG.ENDPOINTS.COUPONS}/${id}`, payload);
    }

    async deleteCoupon(id) {
        return apiClient.delete(`${API_CONFIG.ENDPOINTS.COUPONS}/${id}`);
    }
}

export const couponService = new CouponService();
export default couponService;
