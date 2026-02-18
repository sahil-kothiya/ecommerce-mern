import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { discountController } from '../controllers/DiscountController.js';

const router = Router();

router.get('/', discountController.index.bind(discountController));
router.get('/form-options', protect, authorize('admin'), discountController.getFormOptions.bind(discountController));
router.get('/:id', discountController.show.bind(discountController));

router.post('/', protect, authorize('admin'), discountController.create.bind(discountController));
router.put('/:id', protect, authorize('admin'), discountController.update.bind(discountController));
router.delete('/:id', protect, authorize('admin'), discountController.destroy.bind(discountController));

export default router;
