import express from 'express';
const router = express.Router();
import{
    registerCustomer,
    loginCustomer,
    getCustomerCart,
    addItemToCart,
    removeItemFromCart,
    getCustomerProfile,
    updateUserProfile,
    updateCustomerByAdmin, // ✅ NEW
    updateCartItemQuantity,
    clearCart,
    getAllCustomers,
    toggleCustomerAdmin,
    toggleCustomerActive,
}from '../controllers/customerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Public routes
router.post('/', registerCustomer);
router.post('/login', loginCustomer);

// ✅ Admin routes (đặt trước route động)
router.get('/all', protect, admin, getAllCustomers);
router.put('/:id/toggle-admin', protect, admin, toggleCustomerAdmin);
router.put('/:id/toggle-active', protect, admin, toggleCustomerActive);
router.put('/:id/update-info', protect, admin, updateCustomerByAdmin); // ✅ NEW

// Private routes (user)
router.route('/cart')
    .get(protect, getCustomerCart)
    .post(protect, addItemToCart)
    .put(protect, updateCartItemQuantity);

router.delete('/cart/:productId', protect, removeItemFromCart);

router.route('/profile')
    .get(protect, getCustomerProfile)
    .put(protect, updateUserProfile);

export default router;