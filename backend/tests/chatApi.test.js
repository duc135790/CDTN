import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import Customer from '../models/customerModel.js';
import Staff from '../models/staffModel.js';
import Conversation from '../models/chatConversationModel.js';
import Message from '../models/chatMessageModel.js';
import { chatView, messageView, normalizeChatMessage, requireChatRead, requireChatReply } from '../utils/chat.js';

const ids = { buyer: '200000000000000000000001', other: '200000000000000000000002', staff: '200000000000000000000003', admin: '200000000000000000000004', chat: '200000000000000000000005' };
const secret = 'chat-tests-not-a-real-secret';
const person = id => ({ _id: id, name: id === ids.staff ? 'Tư vấn viên' : 'Khách hàng', isAdmin: id === ids.admin, authVersion: 0, isActive: true });
const chatOf = overrides => ({ _id: ids.chat, customer: ids.buyer, customerName: 'Khách hàng', state: 'open', assignedTo: { id: ids.staff, accountType: 'staff', name: 'Tư vấn viên' }, revision: 2, lastSeq: 3, lastCustomerSeq: 3, lastStoreSeq: 2, customerReadSeq: 0, storeReadSeq: 0, lastMessage: 'Cần chọn size', ...overrides });
const query = value => { const result = { then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) }; for (const method of ['select', 'sort', 'skip', 'limit', 'session']) result[method] = () => result; return result; };
const token = (id = ids.buyer, accountType = 'customer') => jwt.sign({ id, accountType, authVersion: 0 }, secret);
let server, base, previousReady, previousSecret;
const install = t => {
  t.mock.method(Customer, 'findById', id => query(person(String(id))));
  t.mock.method(Staff, 'findById', id => query(person(String(id))));
};
const request = async (path, { method = 'GET', body, auth = token() } = {}) => {
  const response = await fetch(base + '/api/chats' + path, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json(), headers: response.headers };
};
before(async () => {
  previousSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = secret;
  previousReady = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 1 });
  server = createServer(createApp()); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  if (previousReady) Object.defineProperty(mongoose.connection, 'readyState', previousReady); else delete mongoose.connection.readyState;
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});

test('chat input is bounded plain text, rejects forged identities and binds retry IDs to the normalized request', () => {
  const body = { text: '  Cần size 40 👟  ', clientId: 'test-message-001' };
  assert.equal(normalizeChatMessage(body).text, 'Cần size 40 👟');
  assert.equal(normalizeChatMessage(body).requestHash, normalizeChatMessage({ ...body, text: 'Cần size 40 👟' }).requestHash);
  assert.notEqual(normalizeChatMessage(body).requestHash, normalizeChatMessage({ ...body, text: 'Cần size 41' }).requestHash);
  for (const invalid of [{ ...body, text: ' ' }, { ...body, text: 'x'.repeat(2001) }, { ...body, clientId: '$bad' }, { ...body, senderId: ids.admin }, { ...body, productId: 'not-id' }]) assert.throws(() => normalizeChatMessage(invalid), error => error.status === 400);
});

test('chat access checks both account type and assigned advisor; customers cannot read another customer', () => {
  const chat = chatOf();
  requireChatRead({ user: person(ids.buyer), accountType: 'customer' }, chat);
  requireChatReply({ user: person(ids.staff), accountType: 'staff' }, chat);
  requireChatRead({ user: person(ids.admin), accountType: 'customer' }, chat);
  assert.throws(() => requireChatRead({ user: person(ids.other), accountType: 'customer' }, chat), error => error.status === 403);
  assert.throws(() => requireChatRead({ user: person(ids.staff), accountType: 'customer' }, chat), error => error.status === 403);
  assert.throws(() => requireChatReply({ user: person(ids.admin), accountType: 'customer' }, chat), error => error.status === 409);
});

test('anonymous users and customers cannot read the inbox, claim, reassign, close or impersonate an advisor', async t => {
  install(t);
  assert.equal((await request('/mine', { auth: null })).status, 401);
  for (const [method, path] of [['GET', '/inbox'], ['POST', `/${ids.chat}/claim`], ['PUT', `/${ids.chat}/assignment`], ['PUT', `/${ids.chat}/close`], ['POST', `/${ids.chat}/messages`]]) assert.equal((await request(path, { method, body: method === 'GET' ? undefined : {} })).status, 403, path);
  assert.equal((await request('/mine', { auth: token(ids.staff, 'staff') })).status, 403);
});

test('mine is scoped to the JWT owner and responses never reveal customer IDs, advisor IDs or request hashes', async t => {
  install(t); let filter; t.mock.method(Conversation, 'findOne', input => { filter = input; return query(chatOf()); });
  const result = await request('/mine'); assert.equal(result.status, 200); assert.equal(String(filter.customer), ids.buyer);
  assert.equal(result.body.customer, undefined); assert.equal(result.body.assignedTo, undefined); assert.equal(result.body.unread, true); assert.equal(result.headers.get('cache-control'), 'no-store');
  const shown = messageView({ _id: 'message', seq: 1, text: 'Test', side: 'store', senderName: 'Advisor', senderId: ids.staff, requestHash: 'private' });
  assert.equal(shown.senderId, undefined); assert.equal(shown.requestHash, undefined);
  assert.equal(chatView(chatOf({ customerReadSeq: 2 })).unread, false);
});

test('message history refuses cross-customer and foreign-advisor reads before accessing messages', async t => {
  install(t); t.mock.method(Conversation, 'findById', () => query(chatOf()));
  t.mock.method(Message, 'find', () => { assert.fail('Must not query messages outside permitted conversation'); });
  assert.equal((await request(`/${ids.chat}/messages`, { auth: token(ids.other) })).status, 403);
  assert.equal((await request(`/${ids.chat}/messages`, { auth: token(ids.other, 'staff') })).status, 403);
});

test('read receipts apply only to the displayed cursor, are monotonic and protect advisor reassignment', async t => {
  install(t); t.mock.method(Conversation, 'findById', () => query(chatOf())); let recorded;
  t.mock.method(Conversation, 'findOneAndUpdate', async (filter, update) => { recorded = { filter, update }; return { storeReadSeq: 2, customerReadSeq: 2 }; });
  const result = await request(`/${ids.chat}/read`, { method: 'PUT', body: { seq: 2 }, auth: token(ids.staff, 'staff') });
  assert.equal(result.status, 200); assert.deepEqual(recorded.update, { $max: { storeReadSeq: 2 } }); assert.equal(recorded.filter.revision, 2);
  assert.equal((await request(`/${ids.chat}/read`, { method: 'PUT', body: { seq: 4 } })).status, 400);
});

test('queue claiming is one atomic conditional write and does not grant access when another advisor wins', async t => {
  install(t); let recorded;
  t.mock.method(Conversation, 'findOneAndUpdate', async (filter, update) => { recorded = { filter, update }; return null; });
  assert.equal((await request(`/${ids.chat}/claim`, { method: 'POST', body: { revision: 2 }, auth: token(ids.staff, 'staff') })).status, 409);
  assert.equal(recorded.filter.assignedTo, null); assert.equal(recorded.filter.state, 'open'); assert.equal(recorded.filter.revision, 2);
  assert.equal(recorded.update.$set.assignedTo.accountType, 'staff');
});

test('staff can see only waiting, their own open, or their own closed inbox; arbitrary view/page is rejected', async t => {
  install(t); let filter;
  t.mock.method(Conversation, 'find', input => { filter = input; return query([]); }); t.mock.method(Conversation, 'countDocuments', async () => 0);
  const auth = token(ids.staff, 'staff');
  assert.equal((await request('/inbox?view=all', { auth })).status, 403);
  assert.equal((await request('/inbox?view=mine', { auth })).status, 200); assert.equal(String(filter['assignedTo.id']), ids.staff); assert.equal(filter['assignedTo.accountType'], 'staff');
  assert.equal((await request('/inbox?view=waiting', { auth })).status, 200); assert.deepEqual(filter, { state: 'open', assignedTo: null });
  assert.equal((await request('/inbox?page=-1', { auth })).status, 400);
});

test('history sorts older pages chronologically and rejects conflicting or invalid pagination cursors', async t => {
  install(t); t.mock.method(Conversation, 'findById', () => query(chatOf()));
  t.mock.method(Message, 'find', () => query([{ seq: 2 }, { seq: 1 }]));
  const result = await request(`/${ids.chat}/messages?before=3`); assert.equal(result.status, 200); assert.deepEqual(result.body.messages.map(row => row.seq), [1, 2]);
  assert.equal((await request(`/${ids.chat}/messages?before=3&after=1`)).status, 400);
  assert.equal((await request(`/${ids.chat}/messages?before=NaN`)).status, 400);
});
