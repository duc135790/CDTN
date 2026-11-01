import express from 'express';
import { login } from '../controllers/authController.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/login', rateLimit({ limit: 20, windowMs: 15 * 60 * 1000 }), login);
export default router;
