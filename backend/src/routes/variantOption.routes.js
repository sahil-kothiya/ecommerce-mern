import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { variantOptionController } from '../controllers/VariantOptionController.js';

const router = Router();

router.get('/', variantOptionController.index.bind(variantOptionController));
router.get('/:id', variantOptionController.show.bind(variantOptionController));

router.post('/', protect, authorize('admin'), variantOptionController.create.bind(variantOptionController));
router.put('/:id', protect, authorize('admin'), variantOptionController.update.bind(variantOptionController));
router.delete('/:id', protect, authorize('admin'), variantOptionController.destroy.bind(variantOptionController));

export default router;
