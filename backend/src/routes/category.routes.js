import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadCategoryImage, handleUploadError } from '../middleware/upload.js';

const router = Router();
const categoryController = new CategoryController();

// Public routes
router.get('/', (req, res) => categoryController.index(req, res));

router.get('/tree', (req, res) => categoryController.getTree(req, res));

router.get('/:slug', (req, res) => categoryController.show(req, res));

router.get('/:slug/products', (req, res) => categoryController.getProducts(req, res));

// Protected routes (Admin only)
router.post('/', protect, authorize('admin'), uploadCategoryImage, handleUploadError, (req, res) => categoryController.store(req, res));

router.post('/reorder', protect, authorize('admin'), (req, res) => categoryController.bulkReorder(req, res));

router.put('/:id', protect, authorize('admin'), uploadCategoryImage, handleUploadError, (req, res) => categoryController.update(req, res));

router.delete('/:id', protect, authorize('admin'), (req, res) => categoryController.destroy(req, res));

export default router;
