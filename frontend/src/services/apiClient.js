import axios from "axios";
import { API_CONFIG } from "@/constants";

const getCookieValue = (name) => {
  const match = document.cookie.match(
    new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`),
  );
  return match ? decodeURIComponent(match[2]) : null;
};

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request interceptor — attach CSRF token ─────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrfToken = getCookieValue("csrfToken");
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — 401 refresh + global error normalisation ─────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) =>
    error ? prom.reject(error) : prom.resolve(token),
  );
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/refresh-token`);
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Import dynamically to avoid circular deps
        const { useAuthStore } = await import("@/store/authStore");
        useAuthStore.getState().clearUser();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { apiClient };
export default apiClient;
