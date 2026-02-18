import { apiClient } from './apiClient.js';
import { API_CONFIG } from '../constants';

class DiscountService {
    async getDiscounts(params = {}) {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.type) queryParams.append('type', params.type);
        if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);

        const query = queryParams.toString();
        return apiClient.get(`${API_CONFIG.ENDPOINTS.DISCOUNTS}${query ? `?${query}` : ''}`);
    }

    async getFormOptions() {
        return apiClient.get(`${API_CONFIG.ENDPOINTS.DISCOUNTS}/form-options`);
    }

    async getDiscountById(id) {
        return apiClient.get(`${API_CONFIG.ENDPOINTS.DISCOUNTS}/${id}`);
    }

    async getAllActiveProducts(params = {}) {
        const limit = Number(params.limit) || 5000;
        const queryParams = new URLSearchParams({
            page: '1',
            limit: String(limit),
            status: 'active',
        });

        if (params.search) queryParams.append('search', params.search);

        const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PRODUCTS}?${queryParams.toString()}`);
        return response?.data?.products || [];
    }

    async createDiscount(payload) {
        return apiClient.post(API_CONFIG.ENDPOINTS.DISCOUNTS, payload);
    }

    async updateDiscount(id, payload) {
        return apiClient.put(`${API_CONFIG.ENDPOINTS.DISCOUNTS}/${id}`, payload);
    }

    async deleteDiscount(id) {
        return apiClient.delete(`${API_CONFIG.ENDPOINTS.DISCOUNTS}/${id}`);
    }
}

export const discountService = new DiscountService();
export default discountService;
