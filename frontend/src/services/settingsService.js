import { API_CONFIG } from "../constants";
import { apiClient } from "./apiClient.js";

class SettingsService {
  async getSettings() {
    return apiClient.get(API_CONFIG.ENDPOINTS.SETTINGS);
  }

  async updateSettings(formData) {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SETTINGS}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const error = new Error(
              errorData.message || "Failed to update settings",
            );
            error.data = errorData;
            reject(error);
          } catch {
            reject(new Error("Failed to update settings"));
          }
        }
      });

      xhr.addEventListener("error", () =>
        reject(new Error("Network error while updating settings")),
      );

      xhr.open("PUT", url);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
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
    return apiClient.get(`${API_CONFIG.ENDPOINTS.SETTINGS}/image/section/${sectionName}`);
  }

  async updateImageSectionSettings(sectionName, data) {
    return apiClient.put(`${API_CONFIG.ENDPOINTS.SETTINGS}/image/section/${sectionName}`, data);
  }

  async resetImageSettings() {
    return apiClient.post(`${API_CONFIG.ENDPOINTS.SETTINGS}/image/reset`);
  }
}

export const settingsService = new SettingsService();
export default settingsService;
