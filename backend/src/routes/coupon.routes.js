import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { couponController } from '../controllers/CouponController.js';

const router = Router();

// Public routes
router.post('/validate', couponController.validate.bind(couponController));

// Protected routes (Admin only)
router.get('/', protect, authorize('admin'), couponController.index.bind(couponController));
router.get('/:id', protect, authorize('admin'), couponController.show.bind(couponController));

router.post('/', protect, authorize('admin'), couponController.create.bind(couponController));

router.put('/:id', protect, authorize('admin'), couponController.update.bind(couponController));

router.delete('/:id', protect, authorize('admin'), couponController.destroy.bind(couponController));

export default router;
