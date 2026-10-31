import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true },
  seq: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  clientId: { type: String, required: true, maxlength: 100 },
  requestHash: { type: String, required: true, maxlength: 64 },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  accountType: { type: String, enum: ['customer', 'staff'], required: true },
  side: { type: String, enum: ['customer', 'store'], required: true },
  senderName: { type: String, required: true, maxlength: 254 },
  text: { type: String, required: true, maxlength: 2000 },
  product: { type: new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true }, image: String,
    price: { type: Number, min: 0, validate: Number.isSafeInteger },
    recommendation: Boolean,
  }, { _id: false }), default: undefined },
}, { timestamps: { createdAt: true, updatedAt: false } });
messageSchema.index({ conversation: 1, seq: 1 }, { unique: true });
messageSchema.index({ conversation: 1, senderId: 1, accountType: 1, clientId: 1 }, { unique: true });
export default mongoose.model('ChatMessage', messageSchema);
