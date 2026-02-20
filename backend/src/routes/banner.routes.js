

import express from 'express';
import { BannerController } from '../controllers/BannerController.js';
import { uploadBannerImage, handleUploadError } from '../middleware/uploadEnhanced.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
const bannerController = new BannerController();

router.get('/', bannerController.index.bind(bannerController));

router.get('/discount-options', protect, authorize('admin'), bannerController.getDiscountOptions.bind(bannerController));

router.get('/analytics', protect, authorize('admin'), bannerController.getAnalytics.bind(bannerController));

router.get('/:id', bannerController.show.bind(bannerController));

router.post(
    '/',
    protect,
    authorize('admin'),
    uploadBannerImage,
    handleUploadError,
    bannerController.create.bind(bannerController)
);

router.put(
    '/:id',
    protect,
    authorize('admin'),
    uploadBannerImage,
    handleUploadError,
    bannerController.update.bind(bannerController)
);

router.delete('/:id', protect, authorize('admin'), bannerController.destroy.bind(bannerController));

router.post('/:id/view', bannerController.trackView.bind(bannerController));

router.post('/:id/click', bannerController.trackClick.bind(bannerController));

export default router;
