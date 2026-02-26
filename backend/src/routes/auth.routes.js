import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { protect } from "../middleware/auth.js";
import {
  authForgotPasswordRateLimiter,
  authRateLimiter,
  authRefreshRateLimiter,
  authResetPasswordRateLimiter,
} from "../middleware/rateLimiter.js";
import { issueCsrfToken } from "../middleware/csrf.js";
import {
  addressIdValidator,
  createAddressValidator,
  emailValidator,
  loginValidator,
  registerValidator,
  resetPasswordValidator,
  updateSearchPreferencesValidator,
  updatePasswordValidator,
  validate,
} from "../validators/index.js";

const router = Router();
const authController = new AuthController();

router.post(
  "/register",
  authRateLimiter,
  registerValidator,
  validate,
  (req, res, next) => authController.register(req, res, next),
);

router.get("/csrf-token", issueCsrfToken);

router.post(
  "/login",
  authRateLimiter,
  loginValidator,
  validate,
  (req, res, next) => authController.login(req, res, next),
);

router.post("/logout", protect, (req, res, next) =>
  authController.logout(req, res, next),
);

router.post("/refresh-token", authRefreshRateLimiter, (req, res, next) =>
  authController.refreshToken(req, res, next),
);

router.get("/me", protect, (req, res, next) =>
  authController.getProfile(req, res, next),
);

router.put("/profile", protect, (req, res, next) =>
  authController.updateProfile(req, res, next),
);

router.put(
  "/change-password",
  protect,
  updatePasswordValidator,
  validate,
  (req, res, next) => authController.changePassword(req, res, next),
);

router.get("/addresses", protect, (req, res, next) =>
  authController.getAddresses(req, res, next),
);
router.post(
  "/addresses",
  protect,
  createAddressValidator,
  validate,
  (req, res, next) => authController.addAddress(req, res, next),
);
router.put(
  "/addresses/:addressId",
  protect,
  addressIdValidator,
  validate,
  (req, res, next) => authController.updateAddress(req, res, next),
);
router.delete(
  "/addresses/:addressId",
  protect,
  addressIdValidator,
  validate,
  (req, res, next) => authController.deleteAddress(req, res, next),
);
router.get("/preferences/product-discovery", protect, (req, res, next) =>
  authController.getSearchPreferences(req, res, next),
);
router.put(
  "/preferences/product-discovery",
  protect,
  updateSearchPreferencesValidator,
  validate,
  (req, res, next) => authController.updateSearchPreferences(req, res, next),
);

router.post(
  "/forgot-password",
  authForgotPasswordRateLimiter,
  emailValidator,
  validate,
  (req, res, next) => authController.forgotPassword(req, res, next),
);

router.post(
  "/reset-password",
  authResetPasswordRateLimiter,
  resetPasswordValidator,
  validate,
  (req, res, next) => authController.resetPassword(req, res, next),
);

router.get("/google", (req, res) => {
  res.status(400).json({
    success: false,
    message: "Google OAuth is not enabled in this environment",
  });
});

router.get("/facebook", (req, res) => {
  res.status(400).json({
    success: false,
    message: "Facebook OAuth is not enabled in this environment",
  });
});

export default router;
