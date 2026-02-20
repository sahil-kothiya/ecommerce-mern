import { logger } from "../utils/logger.js";

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
      return await apiClient.upload(
        API_CONFIG.ENDPOINTS.BRANDS,
        formData,
        (progress) => {
          logger.info(`Upload progress: ${progress.toFixed(2)}%`);
        },
      );
    } catch (error) {
            if (error.errors) {
        throw error;
      }
      throw new Error(error.message || "Failed to create brand");
    }
  }

async updateBrand(id, formData) {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}/${id}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
                    try {
            const errorData = JSON.parse(xhr.responseText);
            const error = new Error(
              errorData.message || `Update failed with status ${xhr.status}`,
            );

                        if (errorData.errors) {
              error.errors = errorData.errors;
            }

            reject(error);
          } catch {
            reject(new Error(`Update failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error occurred"));
      });

      xhr.open("PUT", url);
      xhr.withCredentials = true;

      xhr.send(formData);
    });
  }

async deleteBrand(id) {
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.BRANDS}/${id}`);
  }
}

export const brandService = new BrandService();
export default brandService;
