import express from 'express';
const router = express.Router();
import {
    getProducts,
    getProductById,
    getAllProductsAdmin,
    createProduct,
    updateProduct,
    deleteProduct,
    updateProductStock,
    toggleProductVisibility,
    createProductReview,
    getBestSellingProducts,
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Admin routes (đặt trước)
router.get('/admin/all', protect, admin, getAllProductsAdmin);
router.get('/stats/best-selling', protect, admin, getBestSellingProducts);

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin CRUD routes
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.put('/:id/stock', protect, admin, updateProductStock);
router.put('/:id/toggle-visibility', protect, admin, toggleProductVisibility);
router.delete('/:id', protect, admin, deleteProduct);

// Review route
router.post('/:id/reviews', protect, createProductReview);

export default router;