import { Router } from 'express';
import { BrandController } from '../controllers/BrandController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadBrandMultiField } from '../middleware/uploadEnhanced.js';

const router = Router();
const brandController = new BrandController();

// Public routes
router.get('/', (req, res) => brandController.index(req, res));

router.get('/:slug', (req, res) => brandController.show(req, res));

router.get('/:slug/products', (req, res) => brandController.getProducts(req, res));

// Protected routes (Admin only)
router.post('/', protect, authorize('admin'), uploadBrandMultiField, (req, res) => brandController.store(req, res));

router.put('/:id', protect, authorize('admin'), uploadBrandMultiField, (req, res) => brandController.update(req, res));

router.delete('/:id', protect, authorize('admin'), (req, res) => brandController.destroy(req, res));

export default router;
