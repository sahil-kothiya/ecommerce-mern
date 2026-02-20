import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadCategoryImage, handleUploadError } from '../middleware/upload.js';

const router = Router();
const categoryController = new CategoryController();

router.get('/', (req, res) => categoryController.index(req, res));

router.get('/tree', (req, res) => categoryController.tree(req, res));

router.get('/flat', (req, res) => categoryController.flat(req, res));
router.get('/filters', (req, res) => categoryController.filters(req, res));

router.get('/navigation', (req, res) => categoryController.navigation(req, res));

router.get('/slug/:slug', (req, res) => categoryController.showBySlug(req, res));

router.get('/:id', (req, res) => categoryController.show(req, res));

router.get('/:id/breadcrumb', (req, res) => categoryController.breadcrumb(req, res));

router.get('/:id/products', (req, res) => categoryController.products(req, res));

router.get('/:id/brands', (req, res) => categoryController.brands(req, res));

router.post('/', protect, authorize('admin'), uploadCategoryImage, handleUploadError, (req, res) => categoryController.store(req, res));

router.post('/reorder', protect, authorize('admin'), (req, res) => categoryController.bulkReorder(req, res));

router.put('/:id', protect, authorize('admin'), uploadCategoryImage, handleUploadError, (req, res) => categoryController.update(req, res));

router.delete('/:id', protect, authorize('admin'), (req, res) => categoryController.destroy(req, res));

export default router;
