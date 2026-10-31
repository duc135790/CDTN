import test from 'node:test';
import assert from 'node:assert/strict';
import Conversation from '../models/chatConversationModel.js';
import Message from '../models/chatMessageModel.js';
import Product from '../models/productModel.js';
import { setupIntegration } from './setup.js';

test('shoe consultation with real HTTP, MongoDB transactions and isolated customer histories', { timeout: 120000 }, async t => {
  const ctx = await setupIntegration(t);
  const buyer = await ctx.createCustomer(), other = await ctx.createCustomer();
  const advisor = await ctx.createStaff(), advisor2 = await ctx.createStaff();
  const admin = await ctx.createCustomer({ isAdmin: true });
  const tokens = { buyer: await ctx.login(buyer), other: await ctx.login(other), advisor: await ctx.loginStaff(advisor), advisor2: await ctx.loginStaff(advisor2), admin: await ctx.login(admin) };
  const api = (method, path, who, body) => ctx.request(method, '/api/chats' + path, { token: tokens[who], body });
  let chatId;

  await t.test('first customer message creates one conversation, stores an authentic product snapshot, and deduplicates retries', async () => {
    assert.equal((await api('GET', '/mine', 'buyer')).body, null);
    const product = await ctx.createProduct();
    const body = { text: 'Mình cần tư vấn size 40 👟', clientId: 'first-message-integration', productId: String(product._id) };
    const results = await Promise.all([api('POST', '/mine/messages', 'buyer', body), api('POST', '/mine/messages', 'buyer', body)]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 201]);
    chatId = results[0].body.conversation._id;
    assert.equal(await Conversation.countDocuments({ customer: buyer._id }), 1); assert.equal(await Message.countDocuments({ conversation: chatId }), 1);
    assert.equal(results[0].body.message.product.name, product.name); assert.equal(results[0].body.message.requestHash, undefined);
    assert.equal((await api('POST', '/mine/messages', 'buyer', { ...body, text: 'Changed payload' })).status, 409);
    const otherChat = await api('POST', '/mine/messages', 'other', { text: 'Tìm giày chạy bộ', clientId: 'other-message-integration' }); assert.equal(otherChat.status, 201);
    assert.notEqual(otherChat.body.conversation._id, chatId);
    assert.equal((await api('GET', `/${chatId}/messages`, 'other')).status, 403);
  });

  await t.test('two employees claiming the same queue entry produce one owner; foreign advisor cannot read or reply', async () => {
    const waiting = await api('GET', '/inbox?view=waiting', 'advisor'); assert.equal(waiting.status, 200);
    const entry = waiting.body.items.find(row => row._id === chatId); assert(entry);
    const claims = await Promise.all(['advisor', 'advisor2'].map(who => api('POST', `/${chatId}/claim`, who, { revision: entry.revision })));
    assert.deepEqual(claims.map(result => result.status).sort(), [200, 409]);
    if (claims[0].status !== 200) [tokens.advisor, tokens.advisor2] = [tokens.advisor2, tokens.advisor];
    assert.equal((await api('GET', `/${chatId}/messages`, 'advisor')).status, 200);
    assert.equal((await api('GET', `/${chatId}/messages`, 'advisor2')).status, 403);
    assert.equal((await api('POST', `/${chatId}/messages`, 'advisor2', { text: 'Unauthorized reply', clientId: 'foreign-reply-integration' })).status, 403);
  });

  await t.test('unread receipts preserve replies arriving after the displayed cursor and never move backwards', async () => {
    const first = await api('POST', `/${chatId}/messages`, 'advisor', { text: 'Bạn thường mang size nào?', clientId: 'advisor-reply-integration-1' }); assert.equal(first.status, 201);
    const seq = first.body.message.seq;
    assert.equal((await api('GET', '/mine', 'buyer')).body.unread, true);
    const second = await api('POST', `/${chatId}/messages`, 'advisor', { text: 'Mình sẽ kiểm tra form giày.', clientId: 'advisor-reply-integration-2' }); assert.equal(second.status, 201);
    assert.equal((await api('PUT', `/${chatId}/read`, 'buyer', { seq })).status, 200);
    assert.equal((await api('GET', '/mine', 'buyer')).body.unread, true);
    await api('PUT', `/${chatId}/read`, 'buyer', { seq: second.body.message.seq });
    await api('PUT', `/${chatId}/read`, 'buyer', { seq: 0 });
    assert.equal((await api('GET', '/mine', 'buyer')).body.unread, false);
    const delta = await api('GET', `/${chatId}/messages?after=${seq}`, 'buyer'); assert.equal(delta.body.messages.length, 1);
  });

  await t.test('admin takes over by version; old advisor loses reply rights; closing preserves history and customer can reopen', async () => {
    const chat = await Conversation.findById(chatId);
    assert.equal((await api('PUT', `/${chatId}/assignment`, 'admin', { staffId: 'self', revision: chat.revision - 1 })).status, 409);
    const assigned = await api('PUT', `/${chatId}/assignment`, 'admin', { staffId: 'self', revision: chat.revision }); assert.equal(assigned.status, 200);
    assert.equal((await api('POST', `/${chatId}/messages`, 'advisor', { text: 'Late response', clientId: 'late-response-integration' })).status, 403);
    const reply = await api('POST', `/${chatId}/messages`, 'admin', { text: 'Cửa hàng đã kiểm tra size.', clientId: 'admin-reply-integration' }); assert.equal(reply.status, 201);
    assert.equal((await api('PUT', `/${chatId}/close`, 'admin', { revision: reply.body.conversation.revision })).status, 200);
    assert.equal((await api('POST', `/${chatId}/messages`, 'admin', { text: 'Cannot send while closed', clientId: 'closed-response-integration' })).status, 409);
    const count = await Message.countDocuments({ conversation: chatId });
    const reopened = await api('POST', '/mine/messages', 'buyer', { text: 'Mình cần hỏi thêm về màu đen.', clientId: 'reopen-message-integration' }); assert.equal(reopened.status, 201);
    assert.equal(reopened.body.conversation._id, chatId); assert.equal(reopened.body.conversation.state, 'open'); assert.equal(reopened.body.conversation.advisorName, null);
    assert.equal(await Message.countDocuments({ conversation: chatId }), count + 1);
  });

  await t.test('advisor suggestions use actual sale prices and reject shoes which become unavailable before sending', async () => {
    const chat = await Conversation.findById(chatId);
    assert.equal((await api('POST', `/${chatId}/claim`, 'admin', { revision: chat.revision })).status, 200);
    const shoe = await ctx.createProduct({ price: 1200000, discountPercent: 25 });
    const suggested = await api('POST', `/${chatId}/messages`, 'admin', { text: 'Mẫu này hợp nhu cầu của bạn.', productId: String(shoe._id), clientId: 'suggestion-price-integration' });
    assert.equal(suggested.status, 201); assert.equal(suggested.body.message.product.price, 900000); assert.equal(suggested.body.message.product.recommendation, true);
    await Product.updateOne({ _id: shoe._id }, { $set: { countInStock: 0, 'variants.$[].quantity': 0 } });
    const count = await Message.countDocuments({ conversation: chatId });
    assert.equal((await api('POST', `/${chatId}/messages`, 'admin', { text: 'Mẫu này vừa hết', productId: String(shoe._id), clientId: 'suggestion-empty-integration' })).status, 409);
    assert.equal(await Message.countDocuments({ conversation: chatId }), count);
    // Customers may still ask when an out-of-stock shoe will return.
    assert.equal((await api('POST', '/mine/messages', 'buyer', { text: 'Khi nào có hàng lại?', productId: String(shoe._id), clientId: 'customer-outofstock-integration' })).status, 201);
    await Product.updateOne({ _id: shoe._id }, { $set: { isHidden: true } });
    assert.equal((await api('POST', `/${chatId}/messages`, 'admin', { text: 'Hidden shoe', productId: String(shoe._id), clientId: 'suggestion-hidden-integration' })).status, 404);
  });

  await t.test('a failed message transaction leaves no empty conversation, sequence hole or unread metadata', async () => {
    const count = await Message.countDocuments({ conversation: chatId });
    const previous = await Conversation.findById(chatId);
    const missing = '000000000000000000000099';
    const rejected = await api('POST', '/mine/messages', 'buyer', { text: 'Missing product', productId: missing, clientId: 'invalid-product-integration' }); assert.equal(rejected.status, 404);
    const after = await Conversation.findById(chatId); assert.equal(after.lastSeq, previous.lastSeq); assert.equal(after.lastMessage, previous.lastMessage); assert.equal(await Message.countDocuments({ conversation: chatId }), count);
    const fresh = await ctx.createCustomer(); tokens.fresh = await ctx.login(fresh);
    assert.equal((await api('POST', '/mine/messages', 'fresh', { text: 'Missing product', productId: missing, clientId: 'fresh-invalid-integration' })).status, 404);
    assert.equal(await Conversation.countDocuments({ customer: fresh._id }), 0);
  });

  await t.test('concurrent first messages get contiguous sequence numbers and history pagination loses no messages', async () => {
    const fresh = await ctx.createCustomer(); tokens.parallel = await ctx.login(fresh);
    const results = await Promise.all([1, 2, 3].map(index => api('POST', '/mine/messages', 'parallel', { text: `Nhu cầu ${index}`, clientId: `parallel-message-${index}` })));
    assert(results.every(result => result.status === 201));
    const id = results[0].body.conversation._id;
    const messages = await Message.find({ conversation: id }).sort({ seq: 1 }); assert.deepEqual(messages.map(message => message.seq), [1, 2, 3]);
    const older = await api('GET', `/${id}/messages?before=3`, 'parallel'); assert.deepEqual(older.body.messages.map(message => message.seq), [1, 2]);
    assert.equal((await api('GET', `/${id}/messages?after=2`, 'parallel')).body.messages[0].seq, 3);
  });
});
