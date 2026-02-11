import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', (req, res) => {
    res.status(501).json({ message: 'Get all users endpoint - Admin only - to be implemented' });
});

router.get('/:id', (req, res) => {
    res.status(501).json({ message: 'Get user by ID endpoint - to be implemented' });
});

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.post('/', (req, res) => {
    res.status(501).json({ message: 'Create user endpoint - to be implemented' });
});

router.put('/:id', (req, res) => {
    res.status(501).json({ message: 'Update user endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
    res.status(501).json({ message: 'Delete user endpoint - to be implemented' });
});

export default router;
