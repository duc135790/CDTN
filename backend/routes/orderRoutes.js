// backend/routes/orderRoutes.js - WITH CANCEL ROUTE
import express from 'express';
const router = express.Router();
import { 
  addOrderItems, 
  getMyOrders, 
  getOrders, 
  updateOrderStatus,
  updateOrderToDelivered, 
  getOrderById, 
  deleteOrder,
  getRevenueStats,
  getTopCustomers,
  getOrdersOverview,
  updatePaymentStatus,
  cancelOrder  // ✅ IMPORT cancelOrder
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Admin stats routes
router.get('/stats/revenue', protect, admin, getRevenueStats);
router.get('/stats/top-customers', protect, admin, getTopCustomers);
router.get('/stats/overview', protect, admin, getOrdersOverview);

// Order routes
router.route('/')
  .post(protect, addOrderItems)
  .get(protect, admin, getOrders);
  
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
router.put('/:id/payment', protect, admin, updatePaymentStatus);

// ✅ NEW: Route hủy đơn hàng (User hoặc Admin)
router.put('/:id/cancel', protect, cancelOrder);

router.delete('/:id', protect, deleteOrder);

export default router;