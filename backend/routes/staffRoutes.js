import express from 'express';
import { registerStaff, loginStaff, getStaff, getStaffProfile, updateStaffProfile, updateStaff } from '../controllers/staffController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireStaffAccount, requireStaffOrAdmin } from '../utils/staffAccess.js';
import { getStaffInventory } from '../controllers/staffWorkController.js';

const router = express.Router();
router.post('/', protect, admin, registerStaff);
router.post('/login', rateLimit({ limit: 20, windowMs: 15 * 60 * 1000 }), loginStaff);
router.get('/', protect, admin, getStaff);
router.get('/profile', protect, requireStaffAccount, getStaffProfile);
router.put('/profile', protect, requireStaffAccount, updateStaffProfile);
// Fail explicitly for earlier clients; a consultation account has no order access.
router.all(['/orders', '/orders/:id', '/orders/:id/status', '/orders/:id/delivery-failure'], protect, (req, res) => res.status(403).json({ message: 'Nhân viên tư vấn không có quyền xem hoặc xử lý đơn hàng' }));
router.get('/inventory', protect, requireStaffOrAdmin, getStaffInventory);
router.put('/:id', protect, admin, updateStaff);
export default router;
