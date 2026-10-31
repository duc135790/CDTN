import mongoose from 'mongoose';
import Conversation from '../models/chatConversationModel.js';
import Message from '../models/chatMessageModel.js';
import Staff from '../models/staffModel.js';
import Product from '../models/productModel.js';
import { httpError } from '../utils/validation.js';
import { productPricing } from '../../shared/productPricing.js';
import { canRecommendProduct } from '../utils/consultationInventory.js';
import { isChatOperator, chatIdentity, isAssignedAdvisor, requireChatRead, requireChatReply, requireChatId,
  chatRevision, normalizeChatMessage, chatView, messageView, ensureChatIndexes } from '../utils/chat.js';

export const getMyChat = async (req, res) => {
  if (isChatOperator(req)) throw httpError(403, 'Vui lòng dùng hộp thư tư vấn của cửa hàng');
  res.json(chatView(await Conversation.findOne({ customer: req.user._id })));
};

export const getChatMessages = async (req, res) => {
  requireChatId(req.params.id);
  const chat = await Conversation.findById(req.params.id);
  requireChatRead(req, chat);
  const { before, after } = req.query;
  if (before !== undefined && after !== undefined) throw httpError(400, 'Chỉ dùng một hướng tải tin nhắn');
  const cursor = before ?? after;
  if (cursor !== undefined && (typeof cursor !== 'string' || !/^\d+$/.test(cursor) || !Number.isSafeInteger(Number(cursor)) || Number(cursor) < 0)) throw httpError(400, 'Vị trí tin nhắn không hợp lệ');
  const filter = { conversation: chat._id, ...(cursor !== undefined ? { seq: { [before !== undefined ? '$lt' : '$gt']: Number(cursor) } } : {}) };
  const rows = await Message.find(filter).sort({ seq: after !== undefined ? 1 : -1 }).limit(41);
  const items = rows.slice(0, 40);
  if (after === undefined) items.reverse();
  res.json({ conversation: chatView(chat, isChatOperator(req)), messages: items.map(messageView), hasMore: rows.length > 40 });
};

export const sendChatMessage = async (req, res) => {
  const input = normalizeChatMessage(req.body);
  const operator = isChatOperator(req);
  if (req.params.id) requireChatId(req.params.id);
  if (operator && !req.params.id) throw httpError(403, 'Vui lòng chọn cuộc trò chuyện cần tư vấn');
  await ensureChatIndexes();
  let answer;
  // Message, sequence, reopening and unread metadata commit together. This also
  // conflicts with simultaneous reassignment/closing instead of accepting a late
  // reply from the old advisor. Retrying an acknowledged send is idempotent.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await mongoose.connection.transaction(async session => {
        let chat = operator ? await Conversation.findById(req.params.id).session(session) : await Conversation.findOne({ customer: req.user._id }).session(session);
        if (!chat && !operator) [chat] = await Conversation.create([{ customer: req.user._id, customerName: req.user.name || 'Khách hàng' }], { session });
        requireChatRead(req, chat);
        const prior = await Message.findOne({ conversation: chat._id, senderId: req.user._id, accountType: req.accountType || 'customer', clientId: input.clientId }).session(session);
        if (prior) {
          if (prior.requestHash !== input.requestHash) throw httpError(409, 'Mã gửi này đã dùng cho nội dung khác. Vui lòng tải lại cuộc trò chuyện');
          answer = { conversation: chatView(chat, operator), message: messageView(prior), duplicate: true }; return;
        }
        requireChatReply(req, chat);
        let product;
        if (input.productId) {
          const shoe = await Product.findOne({ _id: input.productId, isHidden: { $ne: true }, isArchived: { $ne: true } }).select('name image price discountPercent countInStock variants isHidden isArchived').session(session);
          if (!shoe) throw httpError(404, 'Đôi giày này hiện không còn hiển thị để tư vấn');
          if (operator && !canRecommendProduct(shoe)) throw httpError(409, 'Đôi giày này vừa hết hàng. Vui lòng chọn đôi khác để gợi ý');
          product = { id: shoe._id, name: shoe.name, image: shoe.image, price: productPricing(shoe).salePrice, recommendation: operator };
        }
        if (!operator && chat.state === 'closed') { chat.state = 'open'; chat.assignedTo = null; chat.closedAt = undefined; chat.revision += 1; }
        chat.lastSeq += 1;
        if (operator) chat.lastStoreSeq = chat.lastSeq; else chat.lastCustomerSeq = chat.lastSeq;
        chat.lastMessage = input.text.slice(0, 160); chat.lastMessageAt = new Date();
        await chat.save({ session });
        const [message] = await Message.create([{
          conversation: chat._id, seq: chat.lastSeq, clientId: input.clientId, requestHash: input.requestHash,
          text: input.text, senderId: req.user._id, accountType: req.accountType || 'customer',
          side: operator ? 'store' : 'customer', senderName: req.user.name || (operator ? 'Nhân viên tư vấn' : 'Khách hàng'),
          ...(product ? { product } : {}),
        }], { session });
        answer = { conversation: chatView(chat, operator), message: messageView(message), duplicate: false };
      });
      break;
    } catch (error) {
      if (error.code === 11000 && attempt === 0) continue;
      if (error.code === 20) throw httpError(503, 'Chức năng tư vấn tạm thời chưa sẵn sàng. Vui lòng thử lại sau');
      throw error;
    }
  }
  res.status(answer.duplicate ? 200 : 201).json(answer);
};

export const getChatInbox = async (req, res) => {
  const view = req.query.view || (req.user.isAdmin ? 'all' : 'waiting');
  const page = Number(req.query.page || 1);
  if (!['all', 'waiting', 'mine', 'closed'].includes(view) || !Number.isSafeInteger(page) || page < 1 || page > 100000) throw httpError(400, 'Bộ lọc hộp thư không hợp lệ');
  if (view === 'all' && !req.user.isAdmin) throw httpError(403, 'Chỉ admin được xem toàn bộ hộp thư');
  const own = { 'assignedTo.id': req.user._id, 'assignedTo.accountType': req.accountType || 'customer' };
  const filter = view === 'waiting' ? { state: 'open', assignedTo: null } : view === 'mine' ? { state: 'open', ...own } : view === 'closed' ? { state: 'closed', ...(req.user.isAdmin ? {} : own) } : {};
  const [rows, total] = await Promise.all([Conversation.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * 20).limit(20), Conversation.countDocuments(filter)]);
  res.json({ items: rows.map(chat => chatView(chat, true)), page, pages: Math.max(1, Math.ceil(total / 20)), total });
};

export const claimChat = async (req, res) => {
  requireChatId(req.params.id); const revision = chatRevision(req.body.revision);
  const chat = await Conversation.findOneAndUpdate({ _id: req.params.id, state: 'open', assignedTo: null, revision }, {
    $set: { assignedTo: chatIdentity(req) }, $inc: { revision: 1 },
  }, { new: true, runValidators: true });
  if (!chat) throw httpError(409, 'Cuộc trò chuyện đã được tiếp nhận hoặc thay đổi. Vui lòng tải lại');
  res.json(chatView(chat, true));
};

export const assignChat = async (req, res) => {
  requireChatId(req.params.id); const revision = chatRevision(req.body.revision);
  let assignedTo = null;
  if (req.body.staffId === 'self') assignedTo = chatIdentity(req);
  else if (req.body.staffId !== null) {
    requireChatId(req.body.staffId);
    const staff = await Staff.findById(req.body.staffId);
    if (!staff || staff.isActive === false || staff.isAdmin) throw httpError(400, 'Nhân viên tư vấn không khả dụng');
    assignedTo = { id: staff._id, accountType: 'staff', name: staff.name || staff.email };
  }
  const chat = await Conversation.findOneAndUpdate({ _id: req.params.id, state: 'open', revision }, { $set: { assignedTo }, $inc: { revision: 1 } }, { new: true, runValidators: true });
  if (!chat) throw httpError(409, 'Cuộc trò chuyện đã thay đổi. Vui lòng tải lại');
  res.json(chatView(chat, true));
};

export const closeChat = async (req, res) => {
  requireChatId(req.params.id); const revision = chatRevision(req.body.revision);
  const chat = await Conversation.findById(req.params.id); requireChatRead(req, chat);
  if (!req.user.isAdmin && !isAssignedAdvisor(req, chat)) throw httpError(403, 'Chỉ người phụ trách được kết thúc cuộc trò chuyện');
  const updated = await Conversation.findOneAndUpdate({ _id: chat._id, revision, state: 'open' }, { $set: { state: 'closed', closedAt: new Date() }, $inc: { revision: 1 } }, { new: true });
  if (!updated) throw httpError(409, 'Cuộc trò chuyện đã thay đổi. Vui lòng tải lại');
  res.json(chatView(updated, true));
};

export const markChatRead = async (req, res) => {
  requireChatId(req.params.id);
  const chat = await Conversation.findById(req.params.id); requireChatRead(req, chat);
  const seq = req.body.seq;
  if (!Number.isSafeInteger(seq) || seq < 0 || seq > chat.lastSeq) throw httpError(400, 'Vị trí đã đọc không hợp lệ');
  const field = isChatOperator(req) ? 'storeReadSeq' : 'customerReadSeq';
  if (chat[field] >= seq) return res.json({ readSeq: chat[field] });
  const updated = await Conversation.findOneAndUpdate({ _id: chat._id, ...(isChatOperator(req) ? { revision: chat.revision } : {}) }, { $max: { [field]: seq } }, { new: true });
  if (!updated) throw httpError(409, 'Phân công tư vấn đã thay đổi. Vui lòng tải lại');
  res.json({ readSeq: updated[field] });
};
