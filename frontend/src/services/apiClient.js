import { API_CONFIG } from '../constants';
import toast from 'react-hot-toast';

class ApiClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = 30000; // 30 seconds
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorInterceptors = [];
        
        this.setupDefaultInterceptors();
    }

    /**
     * Setup default request/response interceptors
     * @private
     */
    setupDefaultInterceptors() {
        // ⚠️ TEMPORARY: JWT AUTHENTICATION DISABLED FOR TESTING
        // TODO: RE-ENABLE AUTHORIZATION HEADER BEFORE PRODUCTION
        
        // Add auth token to requests - DISABLED
        this.addRequestInterceptor(async (config) => {
            console.log('⚠️ WARNING: Authorization header DISABLED for testing');
            // const token = localStorage.getItem('auth_token');
            // if (token) {
            //     config.headers = config.headers || {};
            //     config.headers.Authorization = `Bearer ${token}`;
            // }
            return config;
        });

        // Add response time tracking
        this.addRequestInterceptor(async (config) => {
            config.metadata = { startTime: new Date() };
            return config;
        });

        this.addResponseInterceptor(async (response) => {
            const endTime = new Date();
            const duration = endTime - response.config.metadata.startTime;
            console.log(`[API] ${response.config.method.toUpperCase()} ${response.config.url} - ${duration}ms`);
            return response;
        });

        // Handle token expiration and authentication errors
        this.addErrorInterceptor(async (error) => {
            if (error.response?.status === 401) {
                // Check if user was authenticated (to avoid showing alert on already logged out users)
                const wasAuthenticated = localStorage.getItem('auth_token');
                
                // Clear authentication data
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                
                // Only show session expired message if user was previously authenticated
                if (wasAuthenticated) {
                    // Set flag for login page to show session expired message
                    sessionStorage.setItem('sessionExpired', 'true');
                    
                    // Show immediate toast notification
                    toast.error('Your session has expired. Please login again.', {
                        duration: 4000,
                        position: 'top-center',
                        id: 'session-expired' // Prevent duplicate toasts
                    });
                }
                
                // Redirect to login page after a short delay to allow toast to show
                setTimeout(() => {
                    window.location.href = '/login';
                }, 500);
            }
            return Promise.reject(error);
        });
    }

    /**
     * Add request interceptor
     * @param {Function} interceptor - Async function to modify request config
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     * @param {Function} interceptor - Async function to modify response
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Add error interceptor
     * @param {Function} interceptor - Async function to handle errors
     */
    addErrorInterceptor(interceptor) {
        this.errorInterceptors.push(interceptor);
    }

    /**
     * Execute request with interceptors
     * @private
     * @param {Object} config - Request configuration
     * @returns {Promise<any>} Response data
     */
    async executeRequest(config) {
        try {
            // Apply request interceptors
            let finalConfig = { ...config };
            for (const interceptor of this.requestInterceptors) {
                finalConfig = await interceptor(finalConfig);
            }

            // Build URL
            const url = finalConfig.url.startsWith('http')
                ? finalConfig.url
                : `${this.baseURL}${finalConfig.url}`;

            // Prepare fetch options
            const fetchOptions = {
                method: finalConfig.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...finalConfig.headers
                },
                credentials: 'include', // Include cookies for cross-origin requests
                ...(finalConfig.body && { body: JSON.stringify(finalConfig.body) }),
                ...(finalConfig.signal && { signal: finalConfig.signal })
            };

            // Create timeout signal
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), this.timeout);

            try {
                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: fetchOptions.signal || timeoutController.signal
                });

                clearTimeout(timeoutId);

                // Parse response
                const contentType = response.headers.get('content-type');
                let data;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                // Create response object
                let responseObj = {
                    data,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    config: finalConfig
                };

                // Check if response is successful
                if (!response.ok) {
                    const error = new Error(data.message || 'Request failed');
                    error.response = responseObj;
                    throw error;
                }

                // Apply response interceptors
                for (const interceptor of this.responseInterceptors) {
                    responseObj = await interceptor(responseObj);
                }

                return responseObj.data;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        } catch (error) {
            // Apply error interceptors
            for (const interceptor of this.errorInterceptors) {
                await interceptor(error);
            }

            throw this.normalizeError(error);
        }
    }

    /**
     * Normalize error for consistent error handling
     * @private
     * @param {Error} error - Original error
     * @returns {Object} Normalized error
     */
    normalizeError(error) {
        if (error.name === 'AbortError') {
            return {
                message: 'Request timeout',
                type: 'TIMEOUT',
                originalError: error
            };
        }

        if (error.response) {
            return {
                message: error.response.data?.message || error.message,
                status: error.response.status,
                type: 'API_ERROR',
                data: error.response.data,
                originalError: error
            };
        }

        return {
            message: error.message || 'Network error',
            type: 'NETWORK_ERROR',
            originalError: error
        };
    }

    /**
     * GET request
     * @param {string} url - Request URL
     * @param {Object} [config={}] - Request configuration
     * @returns {Promise<any>} Response data
     */
    async get(url, config = {}) {
        return this.executeRequest({ ...config, url, method: 'GET' });
    }

    /**
     * POST request
     * @param {string} url - Request URL
     * @param {Object} data - Request body
     * @param {Object} [config={}] - Request configuration
     * @returns {Promise<any>} Response data
     */
    async post(url, data, config = {}) {
        return this.executeRequest({ ...config, url, method: 'POST', body: data });
    }

    /**
     * PUT request
     * @param {string} url - Request URL
     * @param {Object} data - Request body
     * @param {Object} [config={}] - Request configuration
     * @returns {Promise<any>} Response data
     */
    async put(url, data, config = {}) {
        return this.executeRequest({ ...config, url, method: 'PUT', body: data });
    }

    /**
     * PATCH request
     * @param {string} url - Request URL
     * @param {Object} data - Request body
     * @param {Object} [config={}] - Request configuration
     * @returns {Promise<any>} Response data
     */
    async patch(url, data, config = {}) {
        return this.executeRequest({ ...config, url, method: 'PATCH', body: data });
    }

    /**
     * DELETE request
     * @param {string} url - Request URL
     * @param {Object} [config={}] - Request configuration
     * @returns {Promise<any>} Response data
     */
    async delete(url, config = {}) {
        return this.executeRequest({ ...config, url, method: 'DELETE' });
    }

    /**
     * Upload file with progress tracking
     * @param {string} url - Upload URL
     * @param {FormData} formData - Form data with file
     * @param {Function} [onProgress] - Progress callback
     * @returns {Promise<any>} Response data
     */
    async upload(url, formData, onProgress) {
        const token = localStorage.getItem('auth_token');
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
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
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', `${this.baseURL}${url}`);
            
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.send(formData);
        });
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
