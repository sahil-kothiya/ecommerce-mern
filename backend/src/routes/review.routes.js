import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/product/:productId', (req, res) => {
    res.status(501).json({ message: 'Get product reviews endpoint - to be implemented' });
});

// Protected routes
router.post('/', protect, (req, res) => {
    res.status(501).json({ message: 'Create review endpoint - to be implemented' });
});

router.put('/:id', protect, (req, res) => {
    res.status(501).json({ message: 'Update review endpoint - to be implemented' });
});

router.delete('/:id', protect, (req, res) => {
    res.status(501).json({ message: 'Delete review endpoint - to be implemented' });
});

// Admin routes
router.put('/:id/status', protect, authorize('admin'), (req, res) => {
    res.status(501).json({ message: 'Update review status endpoint - to be implemented' });
});

export default router;
