import express from 'express';
const router = express.Router();
import { registerStaff, loginStaff } from '../controllers/staffController.js';

router.post('/', registerStaff);
router.post('/login', loginStaff);
export default router;