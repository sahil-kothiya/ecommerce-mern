import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { reviewController } from '../controllers/ReviewController.js';

const router = Router();

router.get('/product/:productId', reviewController.getProductReviews.bind(reviewController));

router.post('/', protect, reviewController.create.bind(reviewController));
router.put('/:id', protect, reviewController.update.bind(reviewController));
router.delete('/:id', protect, reviewController.destroy.bind(reviewController));

router.get('/', protect, authorize('admin'), reviewController.index.bind(reviewController));
router.put('/:id/status', protect, authorize('admin'), reviewController.updateStatus.bind(reviewController));

export default router;
