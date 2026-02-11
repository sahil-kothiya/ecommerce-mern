import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { protect, authorize } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authRateLimiter, (req, res) => authController.register(req, res));

router.post('/login', authRateLimiter, (req, res) => authController.login(req, res));

router.post('/logout', protect, (req, res) => {
    // Log logout event
    const userEmail = req.user?.email || 'Unknown';
    console.log(`🚪 User logged out: ${userEmail}`);
    
    // In a stateless JWT system, logout is handled client-side
    // For future enhancement: implement token blacklist or use Redis
    res.status(200).json({ 
        success: true, 
        message: 'Logged out successfully' 
    });
});

router.post('/forgot-password', authRateLimiter, (req, res) => {
    res.status(501).json({ message: 'Forgot password endpoint - to be implemented' });
});

router.post('/reset-password', authRateLimiter, (req, res) => {
    res.status(501).json({ message: 'Reset password endpoint - to be implemented' });
});

// Protected routes
router.get('/me', protect, (req, res) => authController.getProfile(req, res));

router.put('/update-profile', protect, (req, res) => authController.updateProfile(req, res));

router.put('/change-password', protect, (req, res) => authController.changePassword(req, res));

router.post('/refresh-token', (req, res) => {
    res.status(501).json({ message: 'Refresh token endpoint - to be implemented' });
});

// OAuth routes
router.get('/google', (req, res) => {
    res.status(501).json({ message: 'Google OAuth endpoint - to be implemented' });
});

router.get('/facebook', (req, res) => {
    res.status(501).json({ message: 'Facebook OAuth endpoint - to be implemented' });
});

export default router;
