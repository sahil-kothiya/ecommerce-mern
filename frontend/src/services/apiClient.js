import { logger } from "../utils/logger.js";

import { API_CONFIG } from "../constants";
import toast from "react-hot-toast";

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
      config.metadata = { startTime: new Date() };
      return config;
    });

    this.addResponseInterceptor(async (response) => {
      const endTime = new Date();
      const duration = response.config.metadata
        ? endTime - response.config.metadata.startTime
        : 0;
      logger.info(
        `[API] ${response.config.method.toUpperCase()} ${response.config.url} - ${duration}ms`,
      );
      return response;
    });

    this.addErrorInterceptor(async (error) => {
      if (error.response?.status === 401) {
        this.handleUnauthorizedRedirect();
      }

      return Promise.reject(error);
    });
  }

  handleUnauthorizedRedirect() {
    const wasAuthenticated = localStorage.getItem("auth_user");

    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    window.dispatchEvent(new Event("auth:logout"));

    if (wasAuthenticated) {
      sessionStorage.setItem("sessionExpired", "true");
      toast.error("Your session has expired. Please login again.", {
        duration: 4000,
        position: "top-center",
        id: "session-expired",
      });
    }

    if (!window.location.pathname.startsWith("/login")) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
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

      const url = finalConfig.url.startsWith("http")
        ? finalConfig.url
        : `${this.baseURL}${finalConfig.url}`;

      const fetchOptions = {
        method: finalConfig.method || "GET",
        headers: {
          ...finalConfig.headers,
        },
        credentials:
          finalConfig.withCredentials === false ? "same-origin" : "include",
        ...(finalConfig.signal && { signal: finalConfig.signal }),
      };

      // Auto-attach Authorization header from localStorage token
      const storedToken =
        localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (storedToken && !fetchOptions.headers["Authorization"]) {
        fetchOptions.headers["Authorization"] = `Bearer ${storedToken}`;
      }

      if (finalConfig.body !== undefined) {
        if (finalConfig.body instanceof FormData) {
          fetchOptions.body = finalConfig.body;
        } else {
          fetchOptions.headers["Content-Type"] = "application/json";
          fetchOptions.body = JSON.stringify(finalConfig.body);
        }
      }

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(
        () => timeoutController.abort(),
        this.timeout,
      );

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: fetchOptions.signal || timeoutController.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
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
          const error = new Error(data.message || "Request failed");
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
    if (error.name === "AbortError") {
      const err = new Error("Request timeout");
      err.type = "TIMEOUT";
      err.originalError = error;
      return err;
    }

    if (error.response) {
      const err = new Error(
        error.response.data?.message || error.message || "Request failed",
      );
      err.type = "API_ERROR";
      err.status = error.response.status;
      err.data = error.response.data;
      err.originalError = error;
      return err;
    }

    const err = new Error(error.message || "Network error");
    err.type = "NETWORK_ERROR";
    err.originalError = error;
    return err;
  }

  async get(url, config = {}) {
    return this.executeRequest({ ...config, url, method: "GET" });
  }

  async post(url, data, config = {}) {
    return this.executeRequest({ ...config, url, method: "POST", body: data });
  }

  async put(url, data, config = {}) {
    return this.executeRequest({ ...config, url, method: "PUT", body: data });
  }

  async patch(url, data, config = {}) {
    return this.executeRequest({ ...config, url, method: "PATCH", body: data });
  }

  async delete(url, config = {}) {
    return this.executeRequest({ ...config, url, method: "DELETE" });
  }

  async upload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      const timeoutId = setTimeout(() => xhr.abort(), this.timeout);

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener("load", () => {
        clearTimeout(timeoutId);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          if (xhr.status === 401) {
            this.handleUnauthorizedRedirect();
          }
          try {
            const errorData = JSON.parse(xhr.responseText);
            const err = new Error(
              errorData?.message || `Upload failed with status ${xhr.status}`,
            );
            err.type = "API_ERROR";
            err.status = xhr.status;
            err.data = errorData;
            if (errorData?.errors) err.errors = errorData.errors;
            reject(err);
          } catch {
            const err = new Error(`Upload failed with status ${xhr.status}`);
            err.type = "API_ERROR";
            err.status = xhr.status;
            reject(err);
          }
        }
      });

      xhr.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        const err = new Error("Request timeout");
        err.type = "TIMEOUT";
        reject(err);
      });

      xhr.addEventListener("error", () => {
        clearTimeout(timeoutId);
        const err = new Error("Network error occurred during upload");
        err.type = "NETWORK_ERROR";
        reject(err);
      });

      xhr.open("POST", `${this.baseURL}${url}`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
