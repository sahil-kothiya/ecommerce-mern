import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { userController } from '../controllers/UserController.js';
import { handleUploadError, uploadUserAvatar } from '../middleware/uploadEnhanced.js';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', userController.index.bind(userController));
router.get('/:id', userController.show.bind(userController));
router.post('/', uploadUserAvatar, handleUploadError, userController.create.bind(userController));
router.put('/:id', uploadUserAvatar, handleUploadError, userController.update.bind(userController));
router.delete('/:id', userController.destroy.bind(userController));

export default router;
