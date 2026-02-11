import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { protect, authorize } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { loginValidator, registerValidator, validate } from '../validators/index.js';

const router = Router();
const authController = new AuthController();

// ============================================================================
// PUBLIC ROUTES - No authentication required
// ============================================================================

// User registration with validation
router.post('/register', authRateLimiter, registerValidator, validate, (req, res, next) => authController.register(req, res, next));

// User login with email/password validation
router.post('/login', authRateLimiter, loginValidator, validate, (req, res, next) => authController.login(req, res, next));

// User logout - requires authentication
router.post('/logout', protect, (req, res, next) => authController.logout(req, res, next));

// Refresh JWT access token
router.post('/refresh-token', authRateLimiter, (req, res, next) => authController.refreshToken(req, res, next));

// Password reset request - sends reset email
router.post('/forgot-password', authRateLimiter, (req, res) => {
    res.status(501).json({ message: 'Forgot password endpoint - to be implemented' });
});

// Reset password with token
router.post('/reset-password', authRateLimiter, (req, res) => {
    res.status(501).json({ message: 'Reset password endpoint - to be implemented' });
});
// Update user profile information
router.put('/update-profile', protect, (req, res, next) => authController.updateProfile(req, res, next));

// Change user password (requires old password)
router.put('/change-password', protect, (req, res, next) => authController.changePassword(req, res, next));

// ============================================================================
// OAUTH ROUTES - Third-party authentication (to be implemented)
// ============================================================================

// Google OAuth login
router.get('/google', (req, res) => {
    res.status(501).json({ message: 'Google OAuth endpoint - to be implemented' });
});

// Facebook OAuth loginrouter.put('/update-profile', protect, (req, res, next) => authController.updateProfile(req, res, next));

router.put('/change-password', protect, (req, res, next) => authController.changePassword(req, res, next));

// OAuth routes
router.get('/google', (req, res) => {
    res.status(501).json({ message: 'Google OAuth endpoint - to be implemented' });
});

router.get('/facebook', (req, res) => {
    res.status(501).json({ message: 'Facebook OAuth endpoint - to be implemented' });
});

export default router;
