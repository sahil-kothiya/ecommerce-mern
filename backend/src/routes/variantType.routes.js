import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { variantTypeController } from '../controllers/VariantTypeController.js';

const router = Router();

router.get('/active', variantTypeController.listActive.bind(variantTypeController));
router.get('/', variantTypeController.index.bind(variantTypeController));
router.get('/:id', variantTypeController.show.bind(variantTypeController));

router.post('/', protect, authorize('admin'), variantTypeController.create.bind(variantTypeController));
router.put('/:id', protect, authorize('admin'), variantTypeController.update.bind(variantTypeController));
router.delete('/:id', protect, authorize('admin'), variantTypeController.destroy.bind(variantTypeController));

export default router;
