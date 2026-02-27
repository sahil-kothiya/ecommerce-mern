import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { User } from "../models/User.js";
import { AppError } from "./errorHandler.js";
import { logger } from "../utils/logger.js";

const extractToken = (req) => {
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const userId = decoded.userId || decoded.id;

    const user = await User.findById(userId).select("name email role status");

    if (!user) {
      return next(new AppError("User no longer exists", 401));
    }

    if (user.status !== "active") {
      return next(new AppError("Your account has been deactivated", 401));
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Token expired", 401));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token", 401));
    }

    logger.error(`Auth middleware error: ${error.message}`);
    return next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    if (req.user.role === "admin") {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role ${req.user.role} is not authorized to access this route`,
          403,
        ),
      );
    }

    return next();
  };
};

export const authorizeOwner = (resourceModel, resourceIdParam = "id") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError("Not authorized to access this route", 401));
      }

      if (req.user.role === "admin") {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return next(new AppError("Resource ID is required", 400));
      }

      const resource = await resourceModel
        .findById(resourceId)
        .select("user userId owner");
      if (!resource) {
        return next(new AppError("Resource not found", 404));
      }

      const ownerId =
        resource.user?._id ||
        resource.user ||
        resource.userId ||
        resource.owner;
      const currentUserId = req.user._id || req.user.id;

      if (ownerId.toString() !== currentUserId.toString()) {
        return next(
          new AppError("You are not authorized to access this resource", 403),
        );
      }

      return next();
    } catch (error) {
      logger.error(`authorizeOwner middleware error: ${error.message}`);
      return next(error);
    }
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select("name email role status");

      if (user && user.status === "active") {
        req.user = user;
      }
    } catch (_err) {
      // token invalid or expired — proceed without user (optional auth)
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
