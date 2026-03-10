import { API_CONFIG } from "../constants";
import { apiClient } from "./apiClient.js";

class SettingsService {
  async getSettings() {
    return apiClient.get(API_CONFIG.ENDPOINTS.SETTINGS);
  }

  async updateSettings(formData) {
    return apiClient.upload(
      API_CONFIG.ENDPOINTS.SETTINGS,
      formData,
      null,
      "PUT",
    );
  }
  async testEmail(to) {
    return apiClient.post(`${API_CONFIG.ENDPOINTS.SETTINGS}/test-email`, {
      to,
    });
  }

  async getImageSettings() {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.SETTINGS}/image`);
  }

  async updateImageSettings(data) {
    return apiClient.put(`${API_CONFIG.ENDPOINTS.SETTINGS}/image`, data);
  }

  async getImageSectionSettings(sectionName) {
    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.SETTINGS}/image/section/${sectionName}`,
    );
  }

  async updateImageSectionSettings(sectionName, data) {
    return apiClient.put(
      `${API_CONFIG.ENDPOINTS.SETTINGS}/image/section/${sectionName}`,
      data,
    );
  }

  async resetImageSettings() {
    return apiClient.post(`${API_CONFIG.ENDPOINTS.SETTINGS}/image/reset`);
  }
}

export const settingsService = new SettingsService();
export default settingsService;
