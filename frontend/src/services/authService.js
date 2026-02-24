import { logger } from "../utils/logger.js";

import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

class AuthService {
  constructor() {
    this.USER_KEY = "auth_user";
    this._userCache = null;
    this._pendingUserFetch = null;

    if (typeof window !== "undefined") {
      window.addEventListener("auth:logout", () => this.reset());
    }
  }

  async login(email, password, rememberMe = false) {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !password) {
      throw new Error("Email and password are required");
    }

    try {
      logger.info("AuthService.login called", {
        email: trimmedEmail,
        rememberMe: Boolean(rememberMe),
      });

      const response = await apiClient.post(
        `${API_CONFIG.ENDPOINTS.AUTH}/login`,
        {
          email: trimmedEmail,
          password,
          rememberMe: Boolean(rememberMe),
        },
      );

      const user = response?.data?.user ?? response?.user;
      const token = response?.data?.accessToken ?? response?.accessToken;
      if (token) localStorage.setItem("auth_token", token);

      this.setUser(user);
      this._emitAuthEvent("auth:login", { user });

      logger.info("Login successful", { userId: user?._id, role: user?.role });

      return response;
    } catch (error) {
      logger.error("Login failed", {
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  async register(userData) {
    const trimmedEmail = userData?.email?.trim();
    const trimmedName = userData?.name?.trim();

    if (!trimmedEmail || !trimmedName || !userData?.password) {
      throw new Error("Name, email, and password are required");
    }

    try {
      const sanitizedData = {
        ...userData,
        email: trimmedEmail,
        name: trimmedName,
      };

      const response = await apiClient.post(
        `${API_CONFIG.ENDPOINTS.AUTH}/register`,
        sanitizedData,
      );

      const user = response?.data?.user ?? response?.user;
      const token = response?.data?.accessToken ?? response?.accessToken;
      if (token) localStorage.setItem("auth_token", token);

      this.setUser(user);
      this._emitAuthEvent("auth:login", { user });

      logger.info("Registration successful", { userId: user?._id });

      return response;
    } catch (error) {
      logger.error("Registration failed", {
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  async logout() {
    try {
      await apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/logout`);
      logger.info("Logout API call successful");
    } catch (error) {
      logger.warn("Logout API call failed, clearing local data anyway", {
        error: error.message,
      });
    } finally {
      this.reset();
    }
  }

  async getCurrentUser() {
    if (this._pendingUserFetch) {
      logger.debug("getCurrentUser: returning pending request");
      return this._pendingUserFetch;
    }

    this._pendingUserFetch = this._fetchCurrentUser();

    try {
      return await this._pendingUserFetch;
    } finally {
      this._pendingUserFetch = null;
    }
  }

  async _fetchCurrentUser() {
    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.AUTH}/me`);
      const user = response.user;

      this.setUser(user);

      logger.info("Current user fetched successfully", { userId: user?._id });

      return this.getUser();
    } catch (error) {
      logger.error("Failed to fetch current user", {
        error: error.message,
        status: error.status,
      });

      if (error.status === 401) {
        this.reset();
      }

      throw error;
    }
  }

  async updateProfile(profileData) {
    if (!profileData || typeof profileData !== "object") {
      throw new Error("Profile data is required");
    }

    try {
      const sanitizedData = { ...profileData };
      if (sanitizedData.name) sanitizedData.name = sanitizedData.name.trim();
      if (sanitizedData.email) sanitizedData.email = sanitizedData.email.trim();

      const response = await apiClient.put(
        `${API_CONFIG.ENDPOINTS.AUTH}/profile`,
        sanitizedData,
      );
      const user = response.user;

      this.setUser(user);

      logger.info("Profile updated successfully", { userId: user?._id });

      return this.getUser();
    } catch (error) {
      logger.error("Profile update failed", {
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required");
    }

    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    try {
      const response = await apiClient.put(
        `${API_CONFIG.ENDPOINTS.AUTH}/change-password`,
        {
          currentPassword,
          newPassword,
        },
      );

      logger.info("Password changed successfully");

      return response;
    } catch (error) {
      logger.error("Password change failed", {
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  getUser() {
    if (this._userCache) return this._userCache;

    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      if (!this._isValidUserObject(parsed)) {
        logger.warn("Invalid user object in localStorage, clearing auth");
        this.reset();
        return null;
      }

      this._userCache = parsed;
      return this._userCache;
    } catch (error) {
      logger.error("Error parsing stored user data", { error: error.message });
      this.reset();
      return null;
    }
  }

  setUser(user) {
    if (!user) {
      this.reset();
      return;
    }

    const sanitizedUser = {
      _id: user._id,
      role: user.role,
      name: user.name,
    };

    this._userCache = sanitizedUser;
    localStorage.setItem(this.USER_KEY, JSON.stringify(sanitizedUser));
  }

  _isValidUserObject(obj) {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj._id === "string" &&
      obj._id.length > 0 &&
      typeof obj.role === "string" &&
      ["user", "customer", "admin", "vendor"].includes(obj.role)
    );
  }

  handleUnauthorizedResponse(response) {
    if (response?.status !== 401) {
      return false;
    }

    logger.warn("Unauthorized response detected, clearing auth");

    this.reset();
    sessionStorage.setItem("sessionExpired", "true");

    this._emitAuthEvent("auth:unauthorized");

    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      setTimeout(() => {
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }, 100);
    }

    return true;
  }

  isAuthenticated() {
    const user = this.getUser();
    return !!user;
  }

  isAdmin() {
    const user = this.getUser();
    return user?.role === "admin";
  }

  hasRole(role) {
    const user = this.getUser();
    return user?.role === role;
  }

  getAuthHeaders(customHeaders = {}, includeContentType = true) {
    const headers = {
      ...(includeContentType ? { "Content-Type": "application/json" } : {}),
      ...customHeaders,
    };

    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("token");

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  reset() {
    this._userCache = null;
    this._pendingUserFetch = null;
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");

    logger.info("Auth state cleared");
  }

  clearAuth() {
    this.reset();
  }

  async forgotPassword(email) {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail) {
      throw new Error("Email is required");
    }

    try {
      const response = await apiClient.post(
        `${API_CONFIG.ENDPOINTS.AUTH}/forgot-password`,
        { email: trimmedEmail },
      );

      logger.info("Password reset email sent", { email: trimmedEmail });

      return response;
    } catch (error) {
      logger.error("Forgot password request failed", {
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw new Error("Token and new password are required");
    }

    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    try {
      const response = await apiClient.post(
        `${API_CONFIG.ENDPOINTS.AUTH}/reset-password`,
        { token, newPassword },
      );

      logger.info("Password reset successful");

      return response;
    } catch (error) {
      logger.error("Reset password failed", {
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  _emitAuthEvent(eventName, detail = {}) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }

  _resetForTesting() {
    this._userCache = null;
    this._pendingUserFetch = null;
  }
}

const authService = new AuthService();
export default authService;
