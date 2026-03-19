import apiClient from "./apiClient";
import { API_CONFIG } from "@/constants";
import { useAuthStore } from "@/store/authStore";

const AUTH = API_CONFIG.ENDPOINTS.AUTH;

const extractUser = (response) => {
  const data = response?.data?.data ?? response?.data;
  return data?.user ?? null;
};

class AuthService {
  async login(email, password, rememberMe = false) {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !password)
      throw new Error("Email and password are required");

    const response = await apiClient.post(`${AUTH}/login`, {
      email: trimmedEmail,
      password,
      rememberMe: Boolean(rememberMe),
    });

    const user = extractUser(response);
    if (user) useAuthStore.getState().setUser(user);
    return response.data;
  }

  async register(userData) {
    const trimmedEmail = userData?.email?.trim();
    const trimmedName = userData?.name?.trim();
    if (!trimmedEmail || !trimmedName || !userData?.password) {
      throw new Error("Name, email, and password are required");
    }

    const { role: _role, ...rest } = userData;
    const response = await apiClient.post(`${AUTH}/register`, {
      ...rest,
      email: trimmedEmail,
      name: trimmedName,
    });

    const user = extractUser(response);
    if (user) useAuthStore.getState().setUser(user);
    return response.data;
  }

  async logout() {
    try {
      await apiClient.post(`${AUTH}/logout`);
    } catch {
      // clear local state even if the API call fails
    } finally {
      useAuthStore.getState().clearUser();
    }
  }

  async getCurrentUser() {
    try {
      const response = await apiClient.get(`${AUTH}/me`);
      const user = extractUser(response);
      if (user) useAuthStore.getState().setUser(user);
      return user;
    } catch (error) {
      if (error.response?.status === 401) {
        useAuthStore.getState().clearUser();
      }
      throw error;
    }
  }

  async updateProfile(profileData) {
    if (!profileData || typeof profileData !== "object") {
      throw new Error("Profile data is required");
    }

    const sanitized = { ...profileData };
    if (sanitized.name) sanitized.name = sanitized.name.trim();
    if (sanitized.email) sanitized.email = sanitized.email.trim();

    const response = await apiClient.put(`${AUTH}/profile`, sanitized);
    const user = extractUser(response);
    if (user) useAuthStore.getState().setUser(user);
    return user;
  }

  async changePassword(currentPassword, newPassword, confirmPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required");
    }
    if (newPassword.length < 8)
      throw new Error("New password must be at least 8 characters");

    const response = await apiClient.put(`${AUTH}/change-password`, {
      currentPassword,
      newPassword,
      confirmPassword: confirmPassword || newPassword,
    });
    return response.data;
  }

  async forgotPassword(email) {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail) throw new Error("Email is required");

    const response = await apiClient.post(`${AUTH}/forgot-password`, {
      email: trimmedEmail,
    });
    return response.data;
  }

  async resetPassword(token, newPassword, confirmPassword) {
    if (!token || !newPassword)
      throw new Error("Token and new password are required");
    if (newPassword.length < 8)
      throw new Error("Password must be at least 8 characters");

    const response = await apiClient.post(`${AUTH}/reset-password`, {
      token,
      newPassword,
      confirmPassword: confirmPassword || newPassword,
    });
    return response.data;
  }

  // ─── Synchronous getters — read from Zustand store ───────────────────────
  getUser() {
    return useAuthStore.getState().user;
  }

  isAuthenticated() {
    return useAuthStore.getState().isAuthenticated;
  }

  isAdmin() {
    return useAuthStore.getState().user?.role === "admin";
  }

  hasRole(role) {
    return useAuthStore.getState().user?.role === role;
  }

  // Keep for backward compatibility — no-op now that Zustand handles state
  reset() {
    useAuthStore.getState().clearUser();
  }

  clearAuth() {
    useAuthStore.getState().clearUser();
  }
}

const authService = new AuthService();
export default authService;
