import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Conversation from '../models/chatConversationModel.js';
import Message from '../models/chatMessageModel.js';
import { cleanText, httpError } from './validation.js';

export const isChatOperator = req => req.user?.isAdmin === true || req.accountType === 'staff';
export const requireChatOperator = (req, res, next) => {
  if (!isChatOperator(req)) return next(httpError(403, 'Chỉ nhân viên tư vấn hoặc admin được truy cập'));
  next();
};
export const chatIdentity = req => ({ id: req.user._id, accountType: req.accountType || 'customer', name: req.user.name || req.user.email });
export const isAssignedAdvisor = (req, chat) => String(chat.assignedTo?.id || '') === String(req.user._id)
  && chat.assignedTo?.accountType === (req.accountType || 'customer');
export const requireChatRead = (req, chat) => {
  if (!chat) throw httpError(404, 'Không tìm thấy cuộc trò chuyện');
  if (req.user.isAdmin) return;
  if (req.accountType === 'staff' ? isAssignedAdvisor(req, chat) : String(chat.customer) === String(req.user._id)) return;
  throw httpError(403, 'Bạn không có quyền xem cuộc trò chuyện này');
};
export const requireChatReply = (req, chat) => {
  requireChatRead(req, chat);
  if (isChatOperator(req) && !isAssignedAdvisor(req, chat)) throw httpError(409, 'Hãy nhận tư vấn hoặc chuyển cuộc trò chuyện về mình trước khi trả lời');
  if (isChatOperator(req) && chat.state !== 'open') throw httpError(409, 'Cuộc trò chuyện đã kết thúc');
};
export const requireChatId = id => { if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, 'Mã cuộc trò chuyện không hợp lệ'); };
export const chatRevision = value => {
  if (!Number.isSafeInteger(value) || value < 0) throw httpError(400, 'Cần phiên bản cuộc trò chuyện hiện tại');
  return value;
};
export const normalizeChatMessage = body => {
  if (Object.keys(body).some(key => !['text', 'clientId', 'productId'].includes(key))) throw httpError(400, 'Nội dung tin nhắn không hợp lệ');
  const text = cleanText(body.text, 'Tin nhắn', { max: 2000 });
  if (typeof body.clientId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.clientId)) throw httpError(400, 'Mã gửi tin nhắn không hợp lệ');
  if (body.productId !== undefined && !mongoose.isObjectIdOrHexString(body.productId)) throw httpError(400, 'Sản phẩm tư vấn không hợp lệ');
  const productId = body.productId ? String(body.productId).toLowerCase() : undefined;
  return { text, clientId: body.clientId, productId, requestHash: createHash('sha256').update(JSON.stringify([text, productId || null])).digest('hex') };
};
export const chatView = (chat, operator = false) => chat ? {
  _id: chat._id, state: chat.state, revision: chat.revision, lastSeq: chat.lastSeq,
  customerName: chat.customerName, advisorName: chat.assignedTo?.name || null,
  lastMessage: chat.lastMessage, lastMessageAt: chat.lastMessageAt,
  unread: operator ? chat.lastCustomerSeq > chat.storeReadSeq : chat.lastStoreSeq > chat.customerReadSeq,
  readSeq: operator ? chat.storeReadSeq : chat.customerReadSeq,
  otherReadSeq: operator ? chat.customerReadSeq : chat.storeReadSeq,
  ...(operator ? { assignedTo: chat.assignedTo } : {}),
} : null;
export const messageView = message => ({
  _id: message._id, seq: message.seq, clientId: message.clientId, text: message.text,
  side: message.side, senderName: message.senderName, createdAt: message.createdAt,
  ...(message.product ? { product: message.product } : {}),
});

// Create both collections/indexes before opening a transaction. Database identity
// is the cache key, so isolated tests/reconnects never reuse another DB's state.
const indexPromises = new WeakMap();
export const ensureChatIndexes = async () => {
  const key = mongoose.connection.db || mongoose.connection;
  if (!indexPromises.has(key)) {
    const promise = Promise.all([Conversation.createIndexes(), Message.createIndexes()]);
    indexPromises.set(key, promise);
    promise.catch(() => { if (indexPromises.get(key) === promise) indexPromises.delete(key); });
  }
  await indexPromises.get(key);
};
