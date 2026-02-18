import { API_CONFIG } from '../constants';
import { apiClient } from './apiClient.js';

class SettingsService {
    async getSettings() {
        return apiClient.get(API_CONFIG.ENDPOINTS.SETTINGS);
    }

    async updateSettings(formData) {
        const token = localStorage.getItem('auth_token');
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SETTINGS}`;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        resolve(xhr.responseText);
                    }
                } else {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        const error = new Error(errorData.message || 'Failed to update settings');
                        error.data = errorData;
                        reject(error);
                    } catch {
                        reject(new Error('Failed to update settings'));
                    }
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error while updating settings')));

            xhr.open('PUT', url);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    }
}

export const settingsService = new SettingsService();
export default settingsService;
