import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, unique: true },
  customerName: { type: String, required: true, maxlength: 100 },
  state: { type: String, enum: ['open', 'closed'], default: 'open', required: true },
  assignedTo: { type: new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    accountType: { type: String, enum: ['customer', 'staff'], required: true },
    name: { type: String, required: true, maxlength: 254 },
  }, { _id: false }), default: null },
  revision: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  lastSeq: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  lastCustomerSeq: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  lastStoreSeq: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  customerReadSeq: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  storeReadSeq: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  lastMessage: { type: String, maxlength: 160, default: '' },
  lastMessageAt: Date,
  closedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });
conversationSchema.index({ state: 1, lastMessageAt: -1 });
conversationSchema.index({ 'assignedTo.id': 1, 'assignedTo.accountType': 1, state: 1, lastMessageAt: -1 });
export default mongoose.model('ChatConversation', conversationSchema);
