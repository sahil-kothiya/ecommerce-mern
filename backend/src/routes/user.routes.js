import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { userController } from '../controllers/UserController.js';
import { createDynamicUpload, handleDynamicUploadError } from '../middleware/dynamicUpload.js';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', userController.index.bind(userController));
router.get('/:id', userController.show.bind(userController));
router.post('/', createDynamicUpload('avatar', { type: 'single', fieldName: 'avatar' }), handleDynamicUploadError, userController.create.bind(userController));
router.put('/:id', createDynamicUpload('avatar', { type: 'single', fieldName: 'avatar' }), handleDynamicUploadError, userController.update.bind(userController));
router.delete('/:id', userController.destroy.bind(userController));

export default router;
