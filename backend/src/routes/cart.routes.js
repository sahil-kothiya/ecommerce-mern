import { Router } from 'express';
import { protect } from '../middleware/auth.js';

const router = Router();

// All cart routes require authentication
router.use(protect);

router.get('/', (req, res) => {
    res.status(501).json({ message: 'Get cart items endpoint - to be implemented' });
});

router.post('/', (req, res) => {
    res.status(501).json({ message: 'Add to cart endpoint - to be implemented' });
});

router.put('/:id', (req, res) => {
    res.status(501).json({ message: 'Update cart item endpoint - to be implemented' });
});

router.delete('/:id', (req, res) => {
    res.status(501).json({ message: 'Remove from cart endpoint - to be implemented' });
});

router.delete('/', (req, res) => {
    res.status(501).json({ message: 'Clear cart endpoint - to be implemented' });
});

export default router;
