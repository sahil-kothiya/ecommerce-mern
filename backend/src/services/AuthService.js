import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../middleware/errorHandler.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const MAX_SAVED_FILTERS = 20;
const MAX_RECENT_SEARCHES = 20;

export class AuthService extends BaseService {
  constructor() {
    super(User);
  }

  async register(userData) {
    const { name, email, password, role = "user" } = userData;

    const existingUser = await this.findOne({ email });
    if (existingUser) {
      throw new AppError("User already exists with this email", 400);
    }

    if (!this.isValidEmail(email)) {
      throw new AppError("Invalid email format", 400);
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message, 400);
    }

    const user = await this.create({
      name,
      email,
      password,
      role,
      status: "active",
      emailVerified: false,
    });

    const tokens = await this.generateAuthTokens(user, false);

    logger.info(`New user registered: ${email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(email, password, rememberMe = false) {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    if (user.status !== "active") {
      throw new AppError("Account is inactive. Please contact support.", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const tokens = await this.generateAuthTokens(user, rememberMe);

    logger.info(
      `User logged in: ${email} ${rememberMe ? "(Remember Me)" : ""}`,
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async getProfile(userId) {
    const user = await this.findByIdOrFail(userId);
    return this.sanitizeUser(user);
  }

  async updateProfile(userId, updateData) {
    const {
      password,
      role,
      status,
      addresses,
      refreshToken,
      provider,
      providerId,
      ...safeData
    } = updateData || {};

    if (typeof safeData.name === "string") {
      safeData.name = safeData.name.trim();
    }

    if (typeof safeData.email === "string") {
      safeData.email = safeData.email.trim().toLowerCase();
      if (!safeData.email) {
        delete safeData.email;
      }
    }

    if (typeof safeData.phone === "string") {
      safeData.phone = safeData.phone.trim();
    }

    const updatedUser = await this.updateOrFail(userId, safeData);
    return this.sanitizeUser(updatedUser);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message, 400);
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    return { message: "Password changed successfully" };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const userId = decoded.userId || decoded.id;

      const user = await this.findById(userId);

      if (!user) {
        throw new AppError("User no longer exists", 401);
      }

      if (user.status !== "active") {
        throw new AppError("Account has been deactivated", 401);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        throw new AppError("Invalid token", 401);
      }
      if (error.name === "TokenExpiredError") {
        throw new AppError("Token expired", 401);
      }
      throw error;
    }
  }

  async generateAuthTokens(user, rememberMe = false) {
    const accessToken = this.generateAccessToken(user);

    const result = {
      accessToken,
      expiresIn: config.jwt.expire,
    };

    if (rememberMe) {
      const refreshToken = this.generateRefreshToken(user);
      const hashedRefreshToken = this.hashRefreshToken(refreshToken);

      await User.findByIdAndUpdate(user._id, {
        refreshToken: hashedRefreshToken,
        $set: { lastLoginAt: new Date() },
      });

      result.refreshToken = refreshToken;
      result.refreshExpiresIn = config.jwt.refreshExpire;
    }

    return result;
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
        type: "access",
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expire },
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        tokenId: crypto.randomUUID(),
        type: "refresh",
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpire },
    );
  }

  hashRefreshToken(refreshToken) {
    return crypto.createHash("sha256").update(refreshToken).digest("hex");
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 401);
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      if (decoded.type !== "refresh") {
        throw new AppError("Invalid token type", 401);
      }

      const user = await User.findById(decoded.userId).select("+refreshToken");

      if (!user) {
        throw new AppError("User not found", 401);
      }

      if (user.status !== "active") {
        throw new AppError("Account is inactive", 401);
      }

      const hashedRefreshToken = this.hashRefreshToken(refreshToken);
      if (!user.refreshToken || user.refreshToken !== hashedRefreshToken) {
        throw new AppError("Invalid refresh token", 401);
      }

      const accessToken = this.generateAccessToken(user);
      const rotatedRefreshToken = this.generateRefreshToken(user);
      const rotatedHashedToken = this.hashRefreshToken(rotatedRefreshToken);

      await User.findByIdAndUpdate(user._id, {
        refreshToken: rotatedHashedToken,
        $set: { lastLoginAt: new Date() },
      });

      logger.info(`Access token refreshed for user: ${user.email}`);

      return {
        accessToken,
        refreshToken: rotatedRefreshToken,
        expiresIn: config.jwt.expire,
        refreshExpiresIn: config.jwt.refreshExpire,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        throw new AppError("Invalid refresh token", 401);
      }
      if (error.name === "TokenExpiredError") {
        throw new AppError("Refresh token expired. Please login again.", 401);
      }
      throw error;
    }
  }

  async revokeRefreshToken(userId) {
    await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1 },
    });

    logger.info(`Refresh token revoked for user: ${userId}`);

    return { message: "Logged out successfully" };
  }

  async requestPasswordReset(email) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!normalizedEmail) {
      return {
        message:
          "If an account exists for this email, a reset link will be sent.",
      };
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return {
        message:
          "If an account exists for this email, a reset link will be sent.",
      };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    logger.info(`Password reset requested for: ${user.email}`);

    return {
      message:
        "If an account exists for this email, a reset link will be sent.",
      ...(config.nodeEnv !== "production" && { resetToken }),
    };
  }

  async resetPassword(resetToken, newPassword) {
    const token = String(resetToken || "").trim();
    if (!token) {
      throw new AppError("Reset token is required", 400);
    }

    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message, 400);
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    logger.info(`Password reset completed for: ${user.email}`);

    return { message: "Password reset successful" };
  }

  sanitizeAddressInput(addressData = {}) {
    return {
      label: String(addressData.label || "").trim() || undefined,
      firstName: String(addressData.firstName || "").trim(),
      lastName: String(addressData.lastName || "").trim(),
      phone: String(addressData.phone || "").trim(),
      address1: String(addressData.address1 || "").trim(),
      address2: String(addressData.address2 || "").trim() || undefined,
      city: String(addressData.city || "").trim(),
      state: String(addressData.state || "").trim() || undefined,
      postCode: String(addressData.postCode || "").trim(),
      country: String(addressData.country || "").trim(),
      isDefault: Object.prototype.hasOwnProperty.call(addressData, "isDefault")
        ? Boolean(addressData.isDefault)
        : undefined,
    };
  }

  validateAddressPayload(addressData) {
    const required = [
      "firstName",
      "lastName",
      "phone",
      "address1",
      "city",
      "postCode",
      "country",
    ];
    const missing = required.filter((field) => !addressData[field]);
    if (missing.length > 0) {
      throw new AppError(
        `Missing required address fields: ${missing.join(", ")}`,
        400,
      );
    }
  }

  async getAddresses(userId) {
    const user = await User.findById(userId).select("addresses").lean();
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user.addresses || [];
  }

  async addAddress(userId, payload) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const address = this.sanitizeAddressInput(payload);
    this.validateAddressPayload(address);

    if (address.isDefault || user.addresses.length === 0) {
      user.addresses = user.addresses.map((item) => ({
        ...item.toObject(),
        isDefault: false,
      }));
      address.isDefault = true;
    }

    user.addresses.push(address);
    await user.save();

    return user.addresses;
  }

  async updateAddress(userId, addressId, payload) {
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new AppError("Invalid address id", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new AppError("Address not found", 404);
    }

    const updates = this.sanitizeAddressInput(payload);
    const merged = {
      label: updates.label ?? address.label,
      firstName: updates.firstName || address.firstName,
      lastName: updates.lastName || address.lastName,
      phone: updates.phone || address.phone,
      address1: updates.address1 || address.address1,
      address2: updates.address2 ?? address.address2,
      city: updates.city || address.city,
      state: updates.state ?? address.state,
      postCode: updates.postCode || address.postCode,
      country: updates.country || address.country,
      isDefault: updates.isDefault ?? address.isDefault,
    };
    this.validateAddressPayload(merged);

    if (merged.isDefault) {
      user.addresses.forEach((item) => {
        item.isDefault = String(item._id) === String(addressId);
      });
    }

    Object.assign(address, merged);
    await user.save();

    return user.addresses;
  }

  async deleteAddress(userId, addressId) {
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new AppError("Invalid address id", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new AppError("Address not found", 404);
    }

    const wasDefault = address.isDefault;
    user.addresses.pull(addressId);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return user.addresses;
  }

  sanitizeSearchPreferences(payload = {}) {
    const rawSavedFilters = Array.isArray(payload.savedFilters)
      ? payload.savedFilters
      : [];
    const rawRecentSearches = Array.isArray(payload.recentSearches)
      ? payload.recentSearches
      : [];

    const savedFilters = rawSavedFilters
      .map((entry) => {
        const name = String(entry?.name || "").trim();
        if (!name) return null;

        const filters = entry?.filters || {};
        return {
          name: name.slice(0, 80),
          filters: {
            search: String(filters.search || "")
              .trim()
              .slice(0, 120),
            category:
              String(filters.category || "all")
                .trim()
                .slice(0, 120) || "all",
            brand:
              String(filters.brand || "all")
                .trim()
                .slice(0, 120) || "all",
            minPrice: String(filters.minPrice || "")
              .trim()
              .slice(0, 20),
            maxPrice: String(filters.maxPrice || "")
              .trim()
              .slice(0, 20),
            sort:
              String(filters.sort || "newest")
                .trim()
                .slice(0, 40) || "newest",
          },
        };
      })
      .filter(Boolean)
      .slice(0, MAX_SAVED_FILTERS);

    const recentSearches = rawRecentSearches
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT_SEARCHES);

    return {
      savedFilters,
      recentSearches,
    };
  }

  async getSearchPreferences(userId) {
    const user = await User.findById(userId).select(
      "preferences.productDiscovery",
    );
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      savedFilters: user.preferences?.productDiscovery?.savedFilters || [],
      recentSearches: user.preferences?.productDiscovery?.recentSearches || [],
    };
  }

  async updateSearchPreferences(userId, payload) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const sanitized = this.sanitizeSearchPreferences(payload);

    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.productDiscovery) {
      user.preferences.productDiscovery = {};
    }

    user.preferences.productDiscovery.savedFilters = sanitized.savedFilters;
    user.preferences.productDiscovery.recentSearches = sanitized.recentSearches;

    await user.save();

    return {
      savedFilters: user.preferences.productDiscovery.savedFilters || [],
      recentSearches: user.preferences.productDiscovery.recentSearches || [],
    };
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    const {
      password,
      __v,
      refreshToken,
      passwordResetToken,
      emailVerificationToken,
      ...sanitizedUser
    } = userObj;
    return sanitizedUser;
  }

  isValidEmail(email) {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    const length = password?.length || 0;

    if (length < 8 || length > 128) {
      return {
        isValid: false,
        message: "Password must be between 8 and 128 characters",
      };
    }

    return { isValid: true };
  }

  async findByEmail(email) {
    return await this.findOne({ email });
  }

  async isAdmin(userId) {
    const user = await this.findById(userId, { select: "role" });
    return user?.role === "admin";
  }
}
