import { logger } from '../utils/logger.js';

/**
 * Brand Service
 * Centralized API calls for brand management
 */

import { apiClient } from "./apiClient.js";
import { API_CONFIG } from "../constants";

class BrandService {
  /**
   * Get all brands with pagination and filters
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Brands list with pagination
   */
  async getAllBrands(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);

    const url = `${API_CONFIG.ENDPOINTS.BRANDS}${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
    return apiClient.get(url);
  }

  /**
   * Get single brand by slug
   * @param {string} slug - Brand slug
   * @returns {Promise<Object>} Brand details
   */
  async getBrandBySlug(slug) {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.BRANDS}/${slug}`);
  }

  /**
   * Get brand by ID
   * @param {string} id - Brand ID
   * @returns {Promise<Object>} Brand details
   */
  async getBrandById(id) {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.BRANDS}/${id}`);
  }

  /**
   * Get products of a specific brand
   * @param {string} slug - Brand slug
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Products list with pagination
   */
  async getBrandProducts(slug, params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const url = `${API_CONFIG.ENDPOINTS.BRANDS}/${slug}/products${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
    return apiClient.get(url);
  }

  /**
   * Create new brand (Admin only)
   * @param {FormData} formData - Brand data with images
   * @returns {Promise<Object>} Created brand
   * @throws {Error} Validation or network errors with formatted error details
   */
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
      // Re-throw with validation errors if present
      if (error.errors) {
        throw error; // Already has proper format
      }
      throw new Error(error.message || "Failed to create brand");
    }
  }

  /**
   * Update existing brand (Admin only)
   * @param {string} id - Brand ID
   * @param {FormData} formData - Updated brand data
   * @returns {Promise<Object>} Updated brand
   * @throws {Error} Validation or network errors with formatted error details
   */
  async updateBrand(id, formData) {
    const token = localStorage.getItem("auth_token");
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
          // Handle server-side validation errors
          try {
            const errorData = JSON.parse(xhr.responseText);
            const error = new Error(
              errorData.message || `Update failed with status ${xhr.status}`,
            );

            // Attach validation errors if present
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

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * Delete brand (Admin only)
   * @param {string} id - Brand ID
   * @returns {Promise<Object>} Success message
   */
  async deleteBrand(id) {
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.BRANDS}/${id}`);
  }
}

// Export singleton instance
export const brandService = new BrandService();
export default brandService;
