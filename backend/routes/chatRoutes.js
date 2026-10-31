import express from 'express';
import { protect, admin, customerOnly } from '../middleware/authMiddleware.js';
import { requireChatOperator } from '../utils/chat.js';
import { getMyChat, getChatMessages, sendChatMessage, getChatInbox, claimChat, assignChat, closeChat, markChatRead } from '../controllers/chatController.js';

// Per-account limits keep unrelated shoppers separate, including behind a proxy.
const messageAttempts = new Map();
const limitMessages = (req, res, next) => {
  const now = Date.now();
  for (const [key, entry] of messageAttempts) if (entry.until <= now) messageAttempts.delete(key);
  const key = `${req.accountType}:${req.user._id}`;
  const entry = messageAttempts.get(key) || { count: 0, until: now + 60000 };
  if (entry.count >= 30) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ message: 'Bạn gửi tin quá nhanh. Vui lòng đợi một chút' }); }
  entry.count += 1; messageAttempts.set(key, entry); next();
};
const router = express.Router();
router.use(protect, (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/mine', customerOnly, getMyChat);
router.post('/mine/messages', customerOnly, limitMessages, sendChatMessage);
router.get('/inbox', requireChatOperator, getChatInbox);
router.get('/:id/messages', getChatMessages);
router.post('/:id/messages', requireChatOperator, limitMessages, sendChatMessage);
router.post('/:id/claim', requireChatOperator, claimChat);
router.put('/:id/assignment', admin, assignChat);
router.put('/:id/close', requireChatOperator, closeChat);
router.put('/:id/read', markChatRead);
export default router;
