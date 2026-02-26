import { validationResult } from "express-validator";
import { AppError } from "../middleware/errorHandler.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const errorMessages = errors.array().map((error) => ({
    field: error.path || error.param,
    message: error.msg,
  }));

  const validationError = new AppError("Validation failed", 400, errorMessages);
  return next(validationError);
};

export * from "./authValidators.js";
export * from "./productValidators.js";
export * from "./orderValidators.js";
export * from "./brandValidators.js";
export * from "./couponValidators.js";
export * from "./reviewValidators.js";
