import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/validate', (req, res) => {
    res.status(501).json({ message: 'Validate coupon endpoint - to be implemented' });
});

// Protected routes (Admin only)
router.get('/', protect, authorize('admin'), (req, res) => {
    res.status(501).json({ message: 'Get all coupons endpoint - to be implemented' });
});

router.post('/', protect, authorize('admin'), (req, res) => {
    res.status(501).json({ message: 'Create coupon endpoint - to be implemented' });
});

router.put('/:id', protect, authorize('admin'), (req, res) => {
    res.status(501).json({ message: 'Update coupon endpoint - to be implemented' });
});

router.delete('/:id', protect, authorize('admin'), (req, res) => {
    res.status(501).json({ message: 'Delete coupon endpoint - to be implemented' });
});

export default router;
