import { Router } from 'express';
import { protect } from '../middleware/auth.js';

const router = Router();

// All wishlist routes require authentication
router.use(protect);

router.get('/', (req, res) => {
    res.status(501).json({ message: 'Get wishlist items endpoint - to be implemented' });
});

router.post('/', (req, res) => {
    res.status(501).json({ message: 'Add to wishlist endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
    res.status(501).json({ message: 'Remove from wishlist endpoint - to be implemented' });
});

router.delete('/', (req, res) => {
    res.status(501).json({ message: 'Clear wishlist endpoint - to be implemented' });
});

export default router;
