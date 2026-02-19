import { logger } from '../utils/logger.js';

import { API_CONFIG } from '../constants';
import toast from 'react-hot-toast';

class ApiClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = 30000;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorInterceptors = [];

        this.setupDefaultInterceptors();
    }

    setupDefaultInterceptors() {
        this.addRequestInterceptor(async (config) => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }

            return config;
        });

        this.addRequestInterceptor(async (config) => {
            config.metadata = { startTime: new Date() };
            return config;
        });

        this.addResponseInterceptor(async (response) => {
            const endTime = new Date();
            const duration = endTime - response.config.metadata.startTime;
            logger.info(`[API] ${response.config.method.toUpperCase()} ${response.config.url} - ${duration}ms`);
            return response;
        });

        this.addErrorInterceptor(async (error) => {
            if (error.response?.status === 401) {
                const wasAuthenticated = localStorage.getItem('auth_token');

                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');

                if (wasAuthenticated) {
                    sessionStorage.setItem('sessionExpired', 'true');
                    toast.error('Your session has expired. Please login again.', {
                        duration: 4000,
                        position: 'top-center',
                        id: 'session-expired',
                    });
                }

                if (!window.location.pathname.startsWith('/login')) {
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 500);
                }
            }

            return Promise.reject(error);
        });
    }

    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    addErrorInterceptor(interceptor) {
        this.errorInterceptors.push(interceptor);
    }

    async executeRequest(config) {
        try {
            let finalConfig = { ...config };
            for (const interceptor of this.requestInterceptors) {
                finalConfig = await interceptor(finalConfig);
            }

            const url = finalConfig.url.startsWith('http')
                ? finalConfig.url
                : `${this.baseURL}${finalConfig.url}`;

            const fetchOptions = {
                method: finalConfig.method || 'GET',
                headers: {
                    ...finalConfig.headers,
                },
                credentials: finalConfig.withCredentials ? 'include' : 'omit',
                ...(finalConfig.signal && { signal: finalConfig.signal }),
            };

            if (finalConfig.body !== undefined) {
                if (finalConfig.body instanceof FormData) {
                    fetchOptions.body = finalConfig.body;
                } else {
                    fetchOptions.headers['Content-Type'] = 'application/json';
                    fetchOptions.body = JSON.stringify(finalConfig.body);
                }
            }

            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), this.timeout);

            try {
                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: fetchOptions.signal || timeoutController.signal,
                });

                clearTimeout(timeoutId);

                const contentType = response.headers.get('content-type');
                let data;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                let responseObj = {
                    data,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    config: finalConfig,
                };

                if (!response.ok) {
                    const error = new Error(data.message || 'Request failed');
                    error.response = responseObj;
                    throw error;
                }

                for (const interceptor of this.responseInterceptors) {
                    responseObj = await interceptor(responseObj);
                }

                return responseObj.data;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        } catch (error) {
            for (const interceptor of this.errorInterceptors) {
                await interceptor(error);
            }

            throw this.normalizeError(error);
        }
    }

    normalizeError(error) {
        if (error.name === 'AbortError') {
            return {
                message: 'Request timeout',
                type: 'TIMEOUT',
                originalError: error,
            };
        }

        if (error.response) {
            return {
                message: error.response.data?.message || error.message,
                status: error.response.status,
                type: 'API_ERROR',
                data: error.response.data,
                originalError: error,
            };
        }

        return {
            message: error.message || 'Network error',
            type: 'NETWORK_ERROR',
            originalError: error,
        };
    }

    async get(url, config = {}) {
        return this.executeRequest({ ...config, url, method: 'GET' });
    }

    async post(url, data, config = {}) {
        return this.executeRequest({ ...config, url, method: 'POST', body: data });
    }

    async put(url, data, config = {}) {
        return this.executeRequest({ ...config, url, method: 'PUT', body: data });
    }

    async patch(url, data, config = {}) {
        return this.executeRequest({ ...config, url, method: 'PATCH', body: data });
    }

    async delete(url, config = {}) {
        return this.executeRequest({ ...config, url, method: 'DELETE' });
    }

    async upload(url, formData, onProgress) {
        const token = localStorage.getItem('auth_token');

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }

            xhr.addEventListener('load', () => {
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
                            errorData?.message || `Upload failed with status ${xhr.status}`
                        );
                        error.status = xhr.status;
                        if (errorData?.errors) {
                            error.errors = errorData.errors;
                        }
                        error.data = errorData;
                        reject(error);
                    } catch {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error occurred during upload'));
            });

            xhr.open('POST', `${this.baseURL}${url}`);
            xhr.withCredentials = false;

            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.send(formData);
        });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
