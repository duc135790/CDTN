import express from 'express';
const router = express.Router();
import {
  getActiveVouchers,
  applyVoucher,
  useVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getAllVouchersAdmin,
  toggleVoucherVisibility // ✅ THÊM
} from '../controllers/voucherController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Public routes
router.get('/', getActiveVouchers);
router.post('/apply', applyVoucher);

// Admin routes
router.get('/admin/all', protect, admin, getAllVouchersAdmin);
router.post('/create', protect, admin, createVoucher);
router.put('/:id', protect, admin, updateVoucher);
router.delete('/:id', protect, admin, deleteVoucher);
router.put('/:id/use', protect, useVoucher);

// ✅ THÊM ROUTE ẨN/HIỆN VOUCHER
router.put('/:id/toggle-visibility', protect, admin, toggleVoucherVisibility);

export default router;