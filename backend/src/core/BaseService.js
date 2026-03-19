import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export class BaseService {
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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

  assertFound(document, resourceName = "Resource") {
    if (!document) throw new AppError(`${resourceName} not found`, 404);
    return document;
  }

  assertOwnership(resource, userId, field = "user") {
    const ownerId = resource[field]?._id || resource[field];
    if (String(ownerId) !== String(userId)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
      );
    }
  }

  logInfo(message, meta = {}) {
    logger.info(message, meta);
  }

  logError(message, error) {
    logger.error(message, error);
  }

  // ─── Repository delegation proxies ───────────────────────────────────────
  // These proxy methods allow services to call inherited methods (findById, etc.)
  // while delegating to the injected this.repository instead of a raw Mongoose model.

  get model() {
    return this.repository.model;
  }

  findAll(options) {
    return this.repository.findAll(options);
  }
  findById(id, options) {
    return this.repository.findById(id, options);
  }
  findByIdOrFail(id, options) {
    return this.repository.findByIdOrFail(id, options);
  }
  findOne(filter, options) {
    return this.repository.findOne(filter, options);
  }
  create(data, session) {
    return this.repository.create(data, session);
  }
  update(id, data, options) {
    return this.repository.updateById(id, data, options);
  }
  updateOrFail(id, data) {
    return this.repository.updateByIdOrFail(id, data);
  }
  delete(id) {
    return this.repository.deleteById(id);
  }
  deleteOrFail(id) {
    return this.repository.deleteByIdOrFail(id);
  }
  exists(filter) {
    return this.repository.exists(filter);
  }
  count(filter) {
    return this.repository.count(filter);
  }
  softDelete(id) {
    return this.repository.softDelete(id);
  }
  bulkCreate(dataArray) {
    return this.repository.bulkCreate(dataArray);
  }
  transaction(operations) {
    return this.repository.transaction(operations);
  }
}
