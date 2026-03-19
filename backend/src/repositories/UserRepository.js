import { BaseRepository } from "./BaseRepository.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";
import crypto from "crypto";

export class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email, includePassword = false) {
    const select = includePassword ? "+password" : undefined;
    return this.findOne(
      { email: String(email).trim().toLowerCase() },
      { lean: !includePassword, select },
    );
  }

  async findByIdWithPassword(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).select("+password");
  }

  async findByIdWithRefreshToken(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).select("+refreshToken");
  }

  async findByResetToken(resetToken) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    return this.model
      .findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
      })
      .select("+passwordResetToken +passwordResetExpires");
  }

  async setRefreshToken(id, hashedToken) {
    return this.updateById(id, {
      refreshToken: hashedToken,
      $set: { lastLoginAt: new Date() },
    });
  }

  async revokeRefreshToken(id) {
    return this.updateOne({ _id: id }, { $unset: { refreshToken: 1 } });
  }

  async setPasswordResetToken(id, hashedToken, expiresAt) {
    return this.updateById(id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: expiresAt,
    });
  }
}
