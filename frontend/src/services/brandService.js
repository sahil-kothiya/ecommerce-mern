import { apiClient } from "./apiClient.js";
import { API_CONFIG } from "../constants";

class BrandService {
  async getAllBrands(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);

    const url = `${API_CONFIG.ENDPOINTS.BRANDS}${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
    return apiClient.get(url);
  }

  async getBrandBySlug(slug) {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.BRANDS}/${slug}`);
  }

  async getBrandById(id) {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.BRANDS}/${id}`);
  }

  async getBrandProducts(slug, params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const url = `${API_CONFIG.ENDPOINTS.BRANDS}/${slug}/products${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
    return apiClient.get(url);
  }

  async createBrand(formData) {
    try {
      return await apiClient.upload(API_CONFIG.ENDPOINTS.BRANDS, formData);
    } catch (error) {
      if (error.errors) {
        throw error;
      }
      throw new Error(error.message || "Failed to create brand");
    }
  }

  async updateBrand(id, formData) {
    try {
      return await apiClient.upload(
        `${API_CONFIG.ENDPOINTS.BRANDS}/${id}`,
        formData,
        null,
        "PUT",
      );
    } catch (error) {
      if (error.errors) {
        throw error;
      }
      throw new Error(error.message || "Failed to update brand");
    }
  }

  async deleteBrand(id) {
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.BRANDS}/${id}`);
  }
}

export const brandService = new BrandService();
export default brandService;
