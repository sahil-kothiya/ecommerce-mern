import mongoose from "mongoose";
import { BaseService } from "../core/BaseService.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";

export class UserService extends BaseService {
  constructor() {
    super(User);
  }

  isValidEmail(value) {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  }

  sanitizeUser(user) {
    if (!user) return null;
    const obj = user.toObject ? user.toObject() : user;
    delete obj.password;
    delete obj.refreshToken;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.emailVerificationToken;
    return obj;
  }

  normalizeRole(role) {
    const value = String(role || "")
      .trim()
      .toLowerCase();
    if (value === "customer") return "user";
    return value;
  }

  normalizePhoto(photo, uploadedFile = null) {
    if (uploadedFile?.filename) {
      return `/uploads/users/${uploadedFile.filename}`;
    }
    if (photo === undefined || photo === null) return null;
    const value = String(photo).trim();
    return value.length ? value : null;
  }

  async getAllUsers(filters = {}) {
    const { page = 1, limit = 20, search, role, status } = filters;

    const skip = (page - 1) * limit;
    const query = {};

    if (search) {
      const trimmed = String(search).trim();
      if (trimmed) {
        query.$or = [
          { name: { $regex: trimmed, $options: "i" } },
          { email: { $regex: trimmed, $options: "i" } },
        ];
      }
    }

    const normalizedRole = this.normalizeRole(role);
    if (normalizedRole && ["admin", "user"].includes(normalizedRole)) {
      query.role = normalizedRole;
    }

    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
      },
    };
  }

  async getUserById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    const user = await User.findById(id).lean();
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async createUser(data, uploadedFile = null) {
    const name = String(data.name || "").trim();
    const email = String(data.email || "")
      .trim()
      .toLowerCase();
    const password = String(data.password || "");
    const role = this.normalizeRole(data.role || "user");
    const status = String(data.status || "active")
      .trim()
      .toLowerCase();
    const photo = this.normalizePhoto(data.photo, uploadedFile);

    const errors = [];
    if (!name || name.length < 2) {
      errors.push({
        field: "name",
        message: "Name must be at least 2 characters",
      });
    }
    if (!email) {
      errors.push({ field: "email", message: "Email is required" });
    } else if (!this.isValidEmail(email)) {
      errors.push({ field: "email", message: "Email format is invalid" });
    }
    if (!password || password.length < 8) {
      errors.push({
        field: "password",
        message: "Password must be at least 8 characters",
      });
    }
    if (!["admin", "user"].includes(role)) {
      errors.push({ field: "role", message: "Role must be admin or user" });
    }
    if (!["active", "inactive"].includes(status)) {
      errors.push({
        field: "status",
        message: "Status must be active or inactive",
      });
    }

    if (email && this.isValidEmail(email)) {
      const exists = await User.findOne({ email }).lean();
      if (exists) {
        errors.push({
          field: "email",
          message: "User already exists with this email",
        });
      }
    }

    if (errors.length > 0) {
      throw new AppError("Validation failed", 422, errors);
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      status,
      photo,
    });
    return this.sanitizeUser(user);
  }

  async updateUser(id, data, uploadedFile = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const errors = [];
    const update = {};

    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name || name.length < 2) {
        errors.push({
          field: "name",
          message: "Name must be at least 2 characters",
        });
      } else {
        update.name = name;
      }
    }

    if (data.email !== undefined) {
      const email = String(data.email).trim().toLowerCase();
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!this.isValidEmail(email)) {
        errors.push({ field: "email", message: "Email format is invalid" });
      } else if (email !== user.email) {
        const exists = await User.findOne({ email }).lean();
        if (exists) {
          errors.push({ field: "email", message: "Email already in use" });
        } else {
          update.email = email;
        }
      }
    }

    if (data.password !== undefined) {
      const password = String(data.password);
      if (password && password.length < 8) {
        errors.push({
          field: "password",
          message: "Password must be at least 8 characters",
        });
      } else if (password) {
        update.password = password;
      }
    }

    if (data.role !== undefined) {
      const role = this.normalizeRole(data.role);
      if (!["admin", "user"].includes(role)) {
        errors.push({ field: "role", message: "Role must be admin or user" });
      } else {
        update.role = role;
      }
    }

    if (data.status !== undefined) {
      const status = String(data.status).trim().toLowerCase();
      if (!["active", "inactive"].includes(status)) {
        errors.push({
          field: "status",
          message: "Status must be active or inactive",
        });
      } else {
        update.status = status;
      }
    }

    if (data.photo !== undefined || uploadedFile) {
      update.photo = this.normalizePhoto(data.photo, uploadedFile);
    }

    if (errors.length > 0) {
      throw new AppError("Validation failed", 422, errors);
    }

    Object.assign(user, update);
    await user.save();
    return this.sanitizeUser(user);
  }

  async deleteUser(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return this.sanitizeUser(user);
  }

  async updateUserStatus(id, status) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    if (!["active", "inactive"].includes(status)) {
      throw new AppError("Invalid status value", 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return this.sanitizeUser(user);
  }
}
