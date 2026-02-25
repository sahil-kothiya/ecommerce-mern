import { BaseController } from "../core/BaseController.js";
import { AuthService } from "../services/AuthService.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../middleware/errorHandler.js";

export class AuthController extends BaseController {
  constructor() {
    const authService = new AuthService();
    super(authService);
  }

  register = this.catchAsync(async (req, res) => {
    const { name, email, password } = req.body;

    this.validateRequiredFields(req.body, ["name", "email", "password"]);

    const { user, accessToken, expiresIn } = await this.service.register({
      name,
      email,
      password,
    });

    this.setTokenCookie(res, "accessToken", accessToken, {
      maxAge: 15 * 60 * 1000,
    });

    this.logAction("User Registration", { email, userId: user._id });

    this.sendSuccess(
      res,
      { user, accessToken, expiresIn },
      201,
      "User registered successfully",
    );
  });

  login = this.catchAsync(async (req, res) => {
    const { email, password, rememberMe: rememberMeRaw } = req.body;

    this.validateRequiredFields(req.body, ["email", "password"]);

    const rememberMe = Boolean(
      rememberMeRaw === true || rememberMeRaw === "true" || rememberMeRaw === 1,
    );

    const result = await this.service.login(email, password, rememberMe);

    this.logAction("User Login", {
      email,
      userId: result.user._id,
      rememberMe,
      hasRefreshToken: !!result.refreshToken,
    });

    this.setTokenCookie(res, "accessToken", result.accessToken, {
      maxAge: 15 * 60 * 1000,
    });

    if (rememberMe && result.refreshToken) {
      this.setTokenCookie(res, "refreshToken", result.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    this.sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        ...(result.refreshToken && {
          refreshExpiresIn: result.refreshExpiresIn,
        }),
      },
      200,
      rememberMe
        ? "Login successful - Remember me enabled"
        : "Login successful",
    );
  });

  getProfile = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);

    const user = await this.service.getProfile(userId);

    this.sendSuccess(res, { user });
  });

  updateProfile = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const updateData = req.body;

    const user = await this.service.updateProfile(userId, updateData);

    this.logAction("Profile Updated", { userId });

    this.sendSuccess(res, { user }, 200, "Profile updated successfully");
  });

  changePassword = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { currentPassword, newPassword } = req.body;

    this.validateRequiredFields(req.body, ["currentPassword", "newPassword"]);

    const result = await this.service.changePassword(
      userId,
      currentPassword,
      newPassword,
    );

    this.logAction("Password Changed", { userId });

    this.sendSuccess(res, result, 200);
  });

  logout = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);

    await this.service.revokeRefreshToken(userId);

    this.clearTokenCookie(res, "accessToken");
    this.clearTokenCookie(res, "refreshToken");

    this.logAction("User Logout", { userId });

    this.sendSuccess(res, { message: "Logged out successfully" }, 200);
  });

  refreshToken = this.catchAsync(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 401);
    }

    const result = await this.service.refreshAccessToken(refreshToken);

    this.setTokenCookie(res, "accessToken", result.accessToken, {
      maxAge: 15 * 60 * 1000,
    });

    if (result.refreshToken) {
      this.setTokenCookie(res, "refreshToken", result.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    this.logAction("Token Refreshed", { userId: result.user._id });

    this.sendSuccess(
      res,
      {
        user: result.user,
        expiresIn: result.expiresIn,
        ...(result.refreshExpiresIn && {
          refreshExpiresIn: result.refreshExpiresIn,
        }),
      },
      200,
      "Token refreshed successfully",
    );
  });

  forgotPassword = this.catchAsync(async (req, res) => {
    const { email } = req.body;
    this.validateRequiredFields(req.body, ["email"]);

    const result = await this.service.requestPasswordReset(email);
    this.logAction("Password Reset Requested", { email });

    this.sendSuccess(res, result, 200);
  });

  resetPassword = this.catchAsync(async (req, res) => {
    const { token, newPassword } = req.body;
    this.validateRequiredFields(req.body, ["token", "newPassword"]);

    const result = await this.service.resetPassword(token, newPassword);
    this.logAction("Password Reset Completed");

    this.sendSuccess(res, result, 200);
  });

  getAddresses = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const addresses = await this.service.getAddresses(userId);
    this.sendSuccess(res, { addresses }, 200);
  });

  addAddress = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const addresses = await this.service.addAddress(userId, req.body);
    this.sendSuccess(res, { addresses }, 201, "Address added successfully");
  });

  updateAddress = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { addressId } = req.params;
    const addresses = await this.service.updateAddress(
      userId,
      addressId,
      req.body,
    );
    this.sendSuccess(res, { addresses }, 200, "Address updated successfully");
  });

  deleteAddress = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const { addressId } = req.params;
    const addresses = await this.service.deleteAddress(userId, addressId);
    this.sendSuccess(res, { addresses }, 200, "Address deleted successfully");
  });

  getSearchPreferences = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const productDiscovery = await this.service.getSearchPreferences(userId);
    this.sendSuccess(res, { productDiscovery }, 200);
  });

  updateSearchPreferences = this.catchAsync(async (req, res) => {
    const userId = this.getUserId(req);
    const productDiscovery = await this.service.updateSearchPreferences(
      userId,
      req.body || {},
    );
    this.sendSuccess(
      res,
      { productDiscovery },
      200,
      "Search preferences updated",
    );
  });
}
