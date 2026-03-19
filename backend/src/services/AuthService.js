import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { UserRepository } from "../repositories/index.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../utils/AppError.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const MAX_SAVED_FILTERS = 20;
const MAX_RECENT_SEARCHES = 20;

export class AuthService extends BaseService {
  constructor(userRepository = new UserRepository()) {
    super();
    this.repository = userRepository;
  }

  async register(userData) {
    const { name, email, password, role = "user" } = userData;

    if (!this.isValidEmail(email))
      throw new AppError("Invalid email format", 400);

    const existing = await this.repository.findByEmail(email);
    if (existing)
      throw new AppError("User already exists with this email", 400);

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.isValid)
      throw new AppError(passwordValidation.message, 400);

    const user = await this.repository.create({
      name,
      email,
      password,
      role,
      status: "active",
      emailVerified: false,
    });
    const tokens = await this.generateAuthTokens(user, false);

    logger.info(`New user registered: ${email}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(email, password, rememberMe = false) {
    const userDoc = await this.repository.findByEmail(email, true);
    if (!userDoc) throw new AppError("Invalid email or password", 401);
    if (userDoc.status !== "active")
      throw new AppError("Account is inactive. Please contact support.", 401);

    const isPasswordValid = await bcrypt.compare(password, userDoc.password);
    if (!isPasswordValid) throw new AppError("Invalid email or password", 401);

    const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    const tokens = await this.generateAuthTokens(user, rememberMe);

    logger.info(
      `User logged in: ${email}${rememberMe ? " (Remember Me)" : ""}`,
    );
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async getProfile(userId) {
    const user = await this.repository.findByIdOrFail(userId);
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

    if (typeof safeData.name === "string") safeData.name = safeData.name.trim();
    if (typeof safeData.email === "string") {
      safeData.email = safeData.email.trim().toLowerCase();
      if (!safeData.email) delete safeData.email;
    }
    if (typeof safeData.phone === "string")
      safeData.phone = safeData.phone.trim();

    const updated = await this.repository.updateByIdOrFail(userId, safeData);
    return this.sanitizeUser(updated);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.repository.findByIdWithPassword(userId);
    if (!user) throw new AppError("User not found", 404);

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid)
      throw new AppError("Current password is incorrect", 401);

    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid)
      throw new AppError(passwordValidation.message, 400);

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);
    return { message: "Password changed successfully" };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const userId = decoded.userId || decoded.id;
      const user = await this.repository.findById(userId);

      if (!user) throw new AppError("User no longer exists", 401);
      if (user.status !== "active")
        throw new AppError("Account has been deactivated", 401);

      return this.sanitizeUser(user);
    } catch (error) {
      if (error.name === "JsonWebTokenError")
        throw new AppError("Invalid token", 401);
      if (error.name === "TokenExpiredError")
        throw new AppError("Token expired", 401);
      throw error;
    }
  }

  async generateAuthTokens(user, rememberMe = false) {
    const accessToken = this.generateAccessToken(user);
    const result = { accessToken, expiresIn: config.jwt.expire };

    if (rememberMe) {
      const refreshToken = this.generateRefreshToken(user);
      const hashedRefreshToken = this.hashToken(refreshToken);
      await this.repository.setRefreshToken(user._id, hashedRefreshToken);
      result.refreshToken = refreshToken;
      result.refreshExpiresIn = config.jwt.refreshExpire;
    }

    return result;
  }

  generateAccessToken(user) {
    return jwt.sign(
      { userId: user._id, role: user.role, email: user.email, type: "access" },
      config.jwt.secret,
      { expiresIn: config.jwt.expire },
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user._id, tokenId: crypto.randomUUID(), type: "refresh" },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpire },
    );
  }

  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) throw new AppError("Refresh token is required", 401);

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      if (decoded.type !== "refresh")
        throw new AppError("Invalid token type", 401);

      const user = await this.repository.findByIdWithRefreshToken(
        decoded.userId,
      );
      if (!user) throw new AppError("User not found", 401);
      if (user.status !== "active")
        throw new AppError("Account is inactive", 401);

      const hashedToken = this.hashToken(refreshToken);
      if (!user.refreshToken || user.refreshToken !== hashedToken) {
        throw new AppError("Invalid refresh token", 401);
      }

      const accessToken = this.generateAccessToken(user);
      const rotatedRefreshToken = this.generateRefreshToken(user);
      await this.repository.setRefreshToken(
        user._id,
        this.hashToken(rotatedRefreshToken),
      );

      logger.info(`Access token refreshed for user: ${user.email}`);
      return {
        accessToken,
        refreshToken: rotatedRefreshToken,
        expiresIn: config.jwt.expire,
        refreshExpiresIn: config.jwt.refreshExpire,
        user: this.sanitizeUser(user.toObject ? user.toObject() : user),
      };
    } catch (error) {
      if (error.name === "JsonWebTokenError")
        throw new AppError("Invalid refresh token", 401);
      if (error.name === "TokenExpiredError")
        throw new AppError("Refresh token expired. Please login again.", 401);
      throw error;
    }
  }

  async revokeRefreshToken(userId) {
    await this.repository.revokeRefreshToken(userId);
    logger.info(`Refresh token revoked for user: ${userId}`);
    return { message: "Logged out successfully" };
  }

  async requestPasswordReset(email) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const generic = {
      message:
        "If an account exists for this email, a reset link will be sent.",
    };
    if (!normalizedEmail) return generic;

    const user = await this.repository.findByEmail(normalizedEmail);
    if (!user) return generic;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repository.setPasswordResetToken(
      user._id,
      hashedToken,
      expiresAt,
    );

    logger.info(`Password reset requested for: ${normalizedEmail}`);
    return {
      ...generic,
      ...(config.nodeEnv !== "production" && { resetToken }),
    };
  }

  async resetPassword(resetToken, newPassword, confirmPassword) {
    const token = String(resetToken || "").trim();
    if (!token) throw new AppError("Reset token is required", 400);

    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid)
      throw new AppError(passwordValidation.message, 400);

    const user = await this.repository.findByResetToken(token);
    if (!user) throw new AppError("Invalid or expired reset token", 400);

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    logger.info(`Password reset completed for user: ${user.email}`);
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
    const user = await this.repository.findById(userId, {
      select: "addresses",
    });
    this.assertFound(user, "User");
    return user.addresses || [];
  }

  async addAddress(userId, payload) {
    const user = await this.repository.findById(userId, { lean: false });
    this.assertFound(user, "User");

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
    if (!mongoose.Types.ObjectId.isValid(addressId))
      throw new AppError("Invalid address id", 400);

    const user = await this.repository.findById(userId, { lean: false });
    this.assertFound(user, "User");

    const address = user.addresses.id(addressId);
    if (!address) throw new AppError("Address not found", 404);

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
    if (!mongoose.Types.ObjectId.isValid(addressId))
      throw new AppError("Invalid address id", 400);

    const user = await this.repository.findById(userId, { lean: false });
    this.assertFound(user, "User");

    const address = user.addresses.id(addressId);
    if (!address) throw new AppError("Address not found", 404);

    const wasDefault = address.isDefault;
    user.addresses.pull(addressId);
    if (wasDefault && user.addresses.length > 0)
      user.addresses[0].isDefault = true;

    await user.save();
    return user.addresses;
  }

  sanitizeSearchPreferences(payload = {}) {
    const rawSaved = Array.isArray(payload.savedFilters)
      ? payload.savedFilters
      : [];
    const rawRecent = Array.isArray(payload.recentSearches)
      ? payload.recentSearches
      : [];

    const savedFilters = rawSaved
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

    const recentSearches = rawRecent
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT_SEARCHES);

    return { savedFilters, recentSearches };
  }

  async getSearchPreferences(userId) {
    const user = await this.repository.findById(userId, {
      select: "preferences.productDiscovery",
    });
    this.assertFound(user, "User");
    return {
      savedFilters: user.preferences?.productDiscovery?.savedFilters || [],
      recentSearches: user.preferences?.productDiscovery?.recentSearches || [],
    };
  }

  async updateSearchPreferences(userId, payload) {
    const user = await this.repository.findById(userId, { lean: false });
    this.assertFound(user, "User");

    const sanitized = this.sanitizeSearchPreferences(payload);
    if (!user.preferences) user.preferences = {};
    if (!user.preferences.productDiscovery)
      user.preferences.productDiscovery = {};

    user.preferences.productDiscovery.savedFilters = sanitized.savedFilters;
    user.preferences.productDiscovery.recentSearches = sanitized.recentSearches;
    await user.save();

    return {
      savedFilters: user.preferences.productDiscovery.savedFilters || [],
      recentSearches: user.preferences.productDiscovery.recentSearches || [],
    };
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
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

  async findByEmail(email) {
    return this.repository.findByEmail(email);
  }
}
