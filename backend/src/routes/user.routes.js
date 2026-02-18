import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { userController } from '../controllers/UserController.js';

const router = Router();

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.get('/', userController.index.bind(userController));
router.get('/:id', userController.show.bind(userController));
router.post('/', userController.create.bind(userController));
router.put('/:id', userController.update.bind(userController));
router.delete('/:id', userController.destroy.bind(userController));

export default router;
