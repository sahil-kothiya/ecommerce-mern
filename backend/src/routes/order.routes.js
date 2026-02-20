import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { orderController } from '../controllers/OrderController.js';
import {
    createOrderValidator,
    orderIdValidator,
    orderQueryValidator,
    returnRequestValidator,
    updateOrderStatusValidator,
    validate,
} from '../validators/index.js';

const router = Router();

router.use(protect);

router.get('/admin/summary', authorize('admin'), orderController.adminSummary.bind(orderController));
router.get('/admin/all', authorize('admin'), orderQueryValidator, validate, orderController.adminAll.bind(orderController));
router.put('/:id/status', authorize('admin'), updateOrderStatusValidator, validate, orderController.updateStatus.bind(orderController));

router.post('/', createOrderValidator, validate, orderController.store.bind(orderController));
router.get('/', orderQueryValidator, validate, orderController.index.bind(orderController));
router.get('/returns', orderController.listReturns.bind(orderController));
router.post('/:id/reorder', orderIdValidator, validate, orderController.reorder.bind(orderController));
router.post('/:id/returns', returnRequestValidator, validate, orderController.requestReturn.bind(orderController));
router.get('/:id', orderIdValidator, validate, orderController.show.bind(orderController));

export default router;
