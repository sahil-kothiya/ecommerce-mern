import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock apiClient before importing authService
vi.mock("./apiClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import apiClient from "./apiClient";
import authService from "./authService";

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a typed Error matching normalizeError output
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Error} Error object with status and type
 */
function apiError(message, status) {
  const err = new Error(message);
  err.status = status;
  err.type = "API_ERROR";
  return err;
}

// ============================================================================
// AUTHSERVICE TEST SUITE
// ============================================================================

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    authService.reset(); // Use public reset() instead of clearAuth()
    authService._resetForTesting(); // Clear internal cache
    window.history.pushState({}, "", "/login");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // LOGIN TESTS
  // ============================================================================

  describe("login()", () => {
    it("stores sanitized user data on successful login", async () => {
      const fullUser = {
        _id: "u1",
        role: "customer",
        email: "user@example.com",
        name: "John Doe",
        phone: "1234567890", // Should not be stored
      };
      apiClient.post.mockResolvedValue({
        user: fullUser,
        accessToken: "legacy-token-should-not-store",
      });

      await authService.login("user@example.com", "Password123!", true);

      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "user@example.com",
        password: "Password123!",
        rememberMe: true,
      });

      const storedUser = authService.getUser();
      expect(storedUser).toEqual({
        _id: "u1",
        role: "customer",
        name: "John Doe",
      });
      // Verify PII not stored
      expect(storedUser).not.toHaveProperty("email");
      expect(storedUser).not.toHaveProperty("phone");
    });

    it("trims email before sending to API", async () => {
      const user = { _id: "u1", role: "customer", name: "Test" };
      apiClient.post.mockResolvedValue({ user });

      await authService.login("  user@example.com  ", "Password123!", false);

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          email: "user@example.com", // trimmed
        }),
      );
    });

    it("validates email and password before API call", async () => {
      await expect(authService.login("", "password", false)).rejects.toThrow(
        "Email and password are required",
      );

      await expect(
        authService.login("email@test.com", "", false),
      ).rejects.toThrow("Email and password are required");

      await expect(authService.login("   ", "password", false)).rejects.toThrow(
        "Email and password are required",
      );

      // Should not call API for invalid input
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("re-throws original error on login failure (preserves type/status)", async () => {
      const err = apiError("Invalid credentials", 401);
      apiClient.post.mockRejectedValue(err);

      await expect(
        authService.login("bad@example.com", "wrong", false),
      ).rejects.toMatchObject({ message: "Invalid credentials", status: 401 });
    });
  });

  // ============================================================================
  // REGISTER TESTS
  // ============================================================================

  describe("register()", () => {
    it("stores sanitized user data on successful registration", async () => {
      const fullUser = {
        _id: "u2",
        role: "customer",
        email: "new@example.com",
        name: "Jane Doe",
      };
      apiClient.post.mockResolvedValue({
        user: fullUser,
        accessToken: "legacy-token-should-not-store",
      });

      await authService.register({
        name: "Jane Doe",
        email: "new@example.com",
        password: "Password123!",
      });

      const storedUser = authService.getUser();
      expect(storedUser).toEqual({
        _id: "u2",
        role: "customer",
        name: "Jane Doe",
      });
      expect(storedUser).not.toHaveProperty("email");
    });

    it("trims name and email before sending", async () => {
      const user = { _id: "u2", role: "customer", name: "Test User" };
      apiClient.post.mockResolvedValue({ user });

      await authService.register({
        name: "  Test User  ",
        email: "  test@example.com  ",
        password: "Password123!",
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
        }),
      );
    });

    it("validates required fields before API call", async () => {
      await expect(
        authService.register({ email: "test@example.com", password: "pass" }),
      ).rejects.toThrow("Name, email, and password are required");

      await expect(
        authService.register({ name: "Test", password: "pass" }),
      ).rejects.toThrow("Name, email, and password are required");

      await expect(
        authService.register({ name: "Test", email: "test@example.com" }),
      ).rejects.toThrow("Name, email, and password are required");

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("re-throws original error on registration failure", async () => {
      const err = apiError("Email already exists", 409);
      apiClient.post.mockRejectedValue(err);

      await expect(
        authService.register({
          name: "Test",
          email: "dup@example.com",
          password: "pass",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  // ============================================================================
  // LOGOUT TESTS
  // ============================================================================

  describe("logout()", () => {
    it("clears all auth data even when logout API call fails", async () => {
      apiClient.post.mockRejectedValue(new Error("Network error"));
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });

      await authService.logout();

      expect(localStorage.getItem("auth_user")).toBeNull();
      expect(authService.getUser()).toBeNull();
    });

    it("clears auth data on successful logout", async () => {
      apiClient.post.mockResolvedValue({ success: true });
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });

      await authService.logout();

      expect(authService.getUser()).toBeNull();
    });
  });

  // ============================================================================
  // GET CURRENT USER TESTS
  // ============================================================================

  describe("getCurrentUser()", () => {
    it("updates stored user on success with sanitized data", async () => {
      const fullUser = {
        _id: "u1",
        role: "admin",
        email: "admin@example.com",
        name: "Admin",
      };
      apiClient.get.mockResolvedValue({ user: fullUser });

      const result = await authService.getCurrentUser();

      // Verify sanitized data stored (no email)
      expect(result).toEqual({
        _id: "u1",
        role: "admin",
        name: "Admin",
      });
      expect(authService.getUser()).toEqual(result);
    });

    it("deduplicates simultaneous calls to prevent multiple API requests", async () => {
      const user = { _id: "u1", role: "customer", name: "Test" };
      apiClient.get.mockResolvedValue({ user });

      // Call getCurrentUser 3 times simultaneously
      const [result1, result2, result3] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentUser(),
        authService.getCurrentUser(),
      ]);

      // All should return same result
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // But API should only be called once
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it("clears auth when server returns 401", async () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });
      apiClient.get.mockRejectedValue(apiError("Unauthorized", 401));

      await expect(authService.getCurrentUser()).rejects.toMatchObject({
        status: 401,
      });

      expect(authService.getUser()).toBeNull();
    });

    it("does NOT clear auth on 503 / network errors", async () => {
      const user = { _id: "u1", role: "customer", name: "Test" };
      authService.setUser(user);
      apiClient.get.mockRejectedValue(apiError("Service unavailable", 503));

      await expect(authService.getCurrentUser()).rejects.toMatchObject({
        status: 503,
      });

      // User should still be authenticated
      expect(authService.getUser()).toEqual(user);
    });
  });

  // ============================================================================
  // PROFILE MANAGEMENT TESTS
  // ============================================================================

  describe("updateProfile()", () => {
    it("updates stored user with sanitized data", async () => {
      const updatedUser = {
        _id: "u1",
        role: "customer",
        name: "Updated Name",
        email: "updated@example.com",
      };
      apiClient.put.mockResolvedValue({ user: updatedUser });

      const result = await authService.updateProfile({ name: "Updated Name" });

      expect(result).toEqual({
        _id: "u1",
        role: "customer",
        name: "Updated Name",
      });
      expect(authService.getUser()).toEqual(result);
    });

    it("trims string fields before sending", async () => {
      const user = { _id: "u1", role: "customer", name: "Test" };
      apiClient.put.mockResolvedValue({ user });

      await authService.updateProfile({
        name: "  Trimmed Name  ",
        email: "  trimmed@example.com  ",
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: "Trimmed Name",
          email: "trimmed@example.com",
        }),
      );
    });

    it("validates profileData is an object", async () => {
      await expect(authService.updateProfile(null)).rejects.toThrow(
        "Profile data is required",
      );

      await expect(authService.updateProfile("invalid")).rejects.toThrow(
        "Profile data is required",
      );

      expect(apiClient.put).not.toHaveBeenCalled();
    });
  });

  describe("changePassword()", () => {
    it("calls correct endpoint with passwords", async () => {
      apiClient.put.mockResolvedValue({ success: true });

      await authService.changePassword("OldPass123!", "NewPass123!");

      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining("change-password"),
        {
          currentPassword: "OldPass123!",
          newPassword: "NewPass123!",
        },
      );
    });

    it("validates both passwords are provided", async () => {
      await expect(
        authService.changePassword("", "NewPass123!"),
      ).rejects.toThrow("Current password and new password are required");

      await expect(
        authService.changePassword("OldPass123!", ""),
      ).rejects.toThrow("Current password and new password are required");

      expect(apiClient.put).not.toHaveBeenCalled();
    });

    it("validates new password length", async () => {
      await expect(
        authService.changePassword("OldPass123!", "short"),
      ).rejects.toThrow("New password must be at least 8 characters");

      expect(apiClient.put).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // UNAUTHORIZED HANDLING TESTS
  // ============================================================================

  describe("handleUnauthorizedResponse()", () => {
    it("handles 401 responses, clears auth and sets sessionExpired flag", () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });

      const handled = authService.handleUnauthorizedResponse({ status: 401 });

      expect(handled).toBe(true);
      expect(authService.getUser()).toBeNull();
      expect(sessionStorage.getItem("sessionExpired")).toBe("true");
    });

    it("returns false for non-401 responses and does not clear auth", () => {
      const user = { _id: "u1", role: "customer", name: "Test" };
      authService.setUser(user);

      const handled = authService.handleUnauthorizedResponse({ status: 403 });

      expect(handled).toBe(false);
      expect(authService.getUser()).toEqual(user);
    });
  });

  // ============================================================================
  // ROLE & AUTHENTICATION CHECKS
  // ============================================================================

  describe("role helpers", () => {
    it("isAuthenticated() returns true when user is stored", () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });
      expect(authService.isAuthenticated()).toBe(true);
    });

    it("isAuthenticated() returns false when no user", () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it("isAdmin() returns true for admin role", () => {
      authService.setUser({ _id: "u1", role: "admin", name: "Admin" });
      expect(authService.isAdmin()).toBe(true);
    });

    it("isAdmin() returns false for non-admin role", () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });
      expect(authService.isAdmin()).toBe(false);
    });

    it("hasRole() matches correct role", () => {
      authService.setUser({ _id: "u1", role: "vendor", name: "Vendor" });
      expect(authService.hasRole("vendor")).toBe(true);
      expect(authService.hasRole("admin")).toBe(false);
    });
  });

  // ─── forgotPassword / resetPassword ─────────────────────────────────────────

  describe("forgotPassword() / resetPassword()", () => {
    it("calls correct endpoint for forgotPassword", async () => {
      apiClient.post.mockResolvedValue({ success: true });

      await authService.forgotPassword("user@example.com");

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("forgot-password"),
        { email: "user@example.com" },
      );
    });

    it("calls correct endpoint for resetPassword", async () => {
      apiClient.post.mockResolvedValue({ success: true });

      await authService.resetPassword("reset-token-abc", "NewPass123!");

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("reset-password"),
        { token: "reset-token-abc", newPassword: "NewPass123!" },
      );
    });

    it("validates token and password for resetPassword", async () => {
      await expect(
        authService.resetPassword("", "NewPass123!"),
      ).rejects.toThrow("Token and new password are required");

      await expect(authService.resetPassword("token123", "")).rejects.toThrow(
        "Token and new password are required",
      );

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("validates password length for resetPassword", async () => {
      await expect(
        authService.resetPassword("token123", "short"),
      ).rejects.toThrow("Password must be at least 8 characters");

      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // LOCALSTORAGE & CACHE TESTS
  // ============================================================================

  describe("in-memory cache", () => {
    it("getUser() reads from cache without hitting localStorage again", () => {
      const user = { _id: "u1", role: "customer", name: "Test" };
      authService.setUser(user);
      authService._resetForTesting(); // Reset cache only (tests internal behavior)

      // First call hydrates cache from localStorage
      authService.getUser();
      // Remove from localStorage — subsequent reads must come from cache
      localStorage.clear();

      expect(authService.getUser()).toEqual(user);
    });

    it("setUser() updates both cache and localStorage with sanitized data", () => {
      const fullUser = {
        _id: "u2",
        role: "admin",
        name: "Admin",
        email: "admin@test.com",
      };
      authService.setUser(fullUser);

      // Should only store sanitized fields
      const expectedUser = { _id: "u2", role: "admin", name: "Admin" };
      expect(authService._userCache).toEqual(expectedUser);
      expect(JSON.parse(localStorage.getItem("auth_user"))).toEqual(
        expectedUser,
      );
    });

    it("setUser(null) clears auth state", () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });

      authService.setUser(null);

      expect(authService.getUser()).toBeNull();
      expect(localStorage.getItem("auth_user")).toBeNull();
    });

    it("getUser() returns null when localStorage contains invalid JSON", () => {
      localStorage.setItem("auth_user", "{ broken json }}}");
      authService._resetForTesting();

      expect(authService.getUser()).toBeNull();
      // Should have cleared the corrupted data
      expect(localStorage.getItem("auth_user")).toBeNull();
    });

    it("getUser() validates user object structure and rejects tampered data", () => {
      // Missing required _id
      localStorage.setItem(
        "auth_user",
        JSON.stringify({ role: "admin", name: "Test" }),
      );
      authService._resetForTesting();
      expect(authService.getUser()).toBeNull();

      // Invalid role
      localStorage.setItem(
        "auth_user",
        JSON.stringify({ _id: "u1", role: "hacker", name: "Bad" }),
      );
      authService._resetForTesting();
      expect(authService.getUser()).toBeNull();

      // Valid data should work
      localStorage.setItem(
        "auth_user",
        JSON.stringify({ _id: "u1", role: "customer", name: "Good" }),
      );
      authService._resetForTesting();
      expect(authService.getUser()).toEqual({
        _id: "u1",
        role: "customer",
        name: "Good",
      });
    });

    it("reset() clears cache, pending requests, and localStorage keys", () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });

      authService.reset();

      expect(authService.getUser()).toBeNull();
      expect(localStorage.getItem("auth_user")).toBeNull();
      expect(authService._pendingUserFetch).toBeNull();
    });

    it("clearAuth() calls reset (deprecated alias)", () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });

      authService.clearAuth();

      expect(authService.getUser()).toBeNull();
    });
  });

  // ============================================================================
  // EVENT HANDLING TESTS
  // ============================================================================

  describe("auth:logout event", () => {
    it("clears cache and storage when apiClient dispatches auth:logout", () => {
      authService.setUser({ _id: "u1", role: "customer", name: "Test" });

      window.dispatchEvent(new Event("auth:logout"));

      expect(authService.getUser()).toBeNull();
      expect(localStorage.getItem("auth_user")).toBeNull();
    });

    it("does not throw when auth:logout fires with no stored user", () => {
      expect(() =>
        window.dispatchEvent(new Event("auth:logout")),
      ).not.toThrow();
      expect(authService.getUser()).toBeNull();
    });
  });
});
