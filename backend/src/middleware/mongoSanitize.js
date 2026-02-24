import mongoSanitize from "express-mongo-sanitize";

const sanitizePayload = (payload, options) => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  return mongoSanitize.sanitize(payload, options);
};

export const mongoSanitizeMiddleware = (options = {}) => {
  return (req, res, next) => {
    sanitizePayload(req.body, options);
    sanitizePayload(req.params, options);
    sanitizePayload(req.query, options);
    next();
  };
};
