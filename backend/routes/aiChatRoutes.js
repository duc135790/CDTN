// backend/routes/aiChatRoutes.js
import express from 'express';
import { aiChat } from '../controllers/aiChatController.js';

const router = express.Router();

// Giới hạn tần suất theo IP (trong bộ nhớ) để khách spam không làm hết quota free của Gemini.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 4;
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const recent = (hits.get(req.ip) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    return res.status(429).json({ message: 'Bạn nhắn quá nhanh, vui lòng thử lại sau ít giây.' });
  }

  recent.push(now);
  hits.set(req.ip, recent);
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, times] of hits) {
    if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
  }
}, WINDOW_MS).unref();

router.post('/', rateLimit, aiChat);

export default router;