import mongoose from "mongoose";
import { BaseController } from "../core/BaseController.js";
import { UserService } from "../services/UserService.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";

export class UserController extends BaseController {
  constructor() {
    super();
    this.userService = new UserService();
  }

  async index(req, res, next) {
    try {
      const result = await this.userService.getAllUsers({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        role: req.query.role,
        status: req.query.status,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(new AppError("Failed to fetch users", 500));
    }
  }

  async show(req, res, next) {
    try {
      const user = await this.userService.getUserById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new AppError("Failed to fetch user", 500));
    }
  }

  async create(req, res, next) {
    try {
      const user = await this.userService.createUser(req.body, req.file);
      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      if (error?.name === "ValidationError") {
        const errors = Object.entries(error.errors || {}).map(
          ([field, item]) => ({
            field,
            message: item?.message || "Invalid value",
          }),
        );
        return next(new AppError("Validation failed", 422, errors));
      }
      if (error?.code === 11000) {
        return next(
          new AppError("User already exists with this email", 400, [
            { field: "email", message: "User already exists with this email" },
          ]),
        );
      }
      next(new AppError("Failed to create user", 500));
    }
  }

  async update(req, res, next) {
    try {
      const user = await this.userService.updateUser(
        req.params.id,
        req.body,
        req.file,
      );
      res.json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      if (error?.name === "ValidationError") {
        const errors = Object.entries(error.errors || {}).map(
          ([field, item]) => ({
            field,
            message: item?.message || "Invalid value",
          }),
        );
        return next(new AppError("Validation failed", 422, errors));
      }
      if (error?.code === 11000) {
        return next(
          new AppError("Email already in use", 400, [
            { field: "email", message: "Email already in use" },
          ]),
        );
      }
      next(new AppError("Failed to update user", 500));
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const user = await this.userService.updateUserStatus(
        req.params.id,
        status,
      );

      res.json({
        success: true,
        message: "User status updated successfully",
        data: user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new AppError("Failed to update user status", 500));
    }
  }

  async destroy(req, res, next) {
    try {
      await this.userService.deleteUser(req.params.id);
      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new AppError("Failed to delete user", 500));
    }
  }
}

export const userController = new UserController();
