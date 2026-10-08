import express from 'express';
const router = express.Router();
import {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Private routes
router
    .route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

export default router;