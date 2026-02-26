import crypto from "crypto";
import { config } from "../config/index.js";
import { AppError } from "./errorHandler.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";

const isProduction = () => config.nodeEnv === "production";

const getCookieOptions = () => {
  const isCrossOrigin = config.frontendUrl !== config.apiUrl;
  return {
    httpOnly: false,
    secure: isProduction(),
    sameSite: isProduction() && isCrossOrigin ? "none" : "lax",
    path: "/",
  };
};

const createToken = () => crypto.randomBytes(32).toString("hex");

export const csrfProtection = (req, res, next) => {
  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = createToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCookieOptions());
  }

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const hasSessionCookie = Boolean(
    req.cookies?.accessToken || req.cookies?.refreshToken || req.cookies?.token,
  );
  if (!hasSessionCookie) {
    return next();
  }

  const headerToken = String(req.headers[CSRF_HEADER_NAME] || "");
  if (!headerToken || headerToken !== csrfToken) {
    return next(new AppError("Invalid CSRF token", 403));
  }

  return next();
};

export const issueCsrfToken = (_req, res) => {
  const csrfToken = createToken();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCookieOptions());
  return res.json({
    success: true,
    data: { csrfToken },
  });
};
