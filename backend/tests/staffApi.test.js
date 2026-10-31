import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import Customer from '../models/customerModel.js';
import Staff from '../models/staffModel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import { recordDeliveryFailure } from '../controllers/deliveryController.js';
import { canRecommendProduct, consultationInventoryQuery } from '../utils/consultationInventory.js';

const ids = { admin: '100000000000000000000001', worker: '100000000000000000000002', other: '100000000000000000000003', order: '100000000000000000000004' };
const secret = 'staff-api-tests-not-a-real-secret';
let server, baseUrl, previousReady, previousSecret;
const query = value => {
  const result = { then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
  for (const method of ['select', 'sort', 'skip', 'limit', 'lean', 'populate']) result[method] = () => result;
  return result;
};
const worker = overrides => ({ _id: ids.worker, name: 'Nhân viên', email: 'worker@example.test', phone: '0901234567', isAdmin: false, isActive: true, authVersion: 0, ...overrides });
const install = (t, person = worker(), administrator = true) => {
  t.mock.method(Staff, 'findById', () => query(person));
  t.mock.method(Customer, 'findById', () => query({ ...worker(), _id: ids.admin, isAdmin: administrator }));
};
const token = (kind = 'staff') => jwt.sign({ id: kind === 'staff' ? ids.worker : ids.admin, accountType: kind, authVersion: 0 }, secret);
const request = async (path, { method = 'GET', body, auth = token() } = {}) => {
  const response = await fetch(baseUrl + '/api' + path, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
};
before(async () => {
  previousSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = secret;
  previousReady = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 1 });
  server = createServer(createApp()); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  if (previousReady) Object.defineProperty(mongoose.connection, 'readyState', previousReady); else delete mongoose.connection.readyState;
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});

test('existing staff tokens expose consultation-only permissions without exposing password or salary', async t => {
  install(t, worker({ password: 'private', salary: 100, role: 'Old job title' }), false);
  const result = await request('/staff/profile'); assert.equal(result.status, 200);
  assert.deepEqual(result.body.permissions, ['inventory:read', 'chat:consult', 'products:recommend']);
  assert.equal(result.body.accountType, 'staff'); assert.equal(result.body.role, 'staff');
  assert.equal(result.body.password, undefined); assert.equal(result.body.salary, undefined);
  assert.equal((await request('/staff/inventory', { auth: null })).status, 401);
  assert.equal((await request('/staff/inventory', { auth: token('customer') })).status, 403);
});

test('consultants cannot read or mutate orders, money, stock, pricing, vouchers or account permissions', async t => {
  install(t);
  for (const [method, path, body] of [
    ['GET', '/orders'], ['GET', '/orders/stats/revenue'], ['GET', '/customers/all'], ['GET', '/products/admin/all'], ['GET', '/staff'],
    ['POST', '/staff', {}], ['PUT', `/staff/${ids.other}`, { isActive: false }],
    ['PUT', `/orders/${ids.order}/assignment`, { staffId: ids.worker, version: 2 }],
    ['PUT', `/orders/${ids.order}/status`, { orderStatus: 'Đã xác nhận' }], ['PUT', `/orders/${ids.order}/deliver`, {}],
    ['PUT', `/orders/${ids.order}/cancel`, {}], ['PUT', `/orders/${ids.order}/payment`, { isPaid: true }],
    ['PUT', `/orders/${ids.order}/refund`, {}], ['PUT', `/orders/${ids.order}/delivery-return`, {}], ['DELETE', `/orders/${ids.order}`],
    ['PUT', `/products/${ids.other}`, { price: 1 }], ['PUT', `/products/${ids.other}/stock`, { countInStock: 999 }],
    ['POST', '/vouchers/create', {}], ['GET', '/customers/cart'], ['POST', '/orders', {}],
    ['DELETE', `/products/${ids.other}/reviews/${ids.order}`],
  ]) assert.equal((await request(path, { method, body })).status, 403, method + ' ' + path);
});

test('earlier staff order endpoints are denied before querying or writing any order', async t => {
  install(t); t.mock.method(Order, 'find', () => assert.fail('No order reads')); t.mock.method(Order, 'findById', () => assert.fail('No order reads'));
  for (const [method, path] of [['GET', '/staff/orders'], ['GET', `/staff/orders/${ids.order}`], ['PUT', `/staff/orders/${ids.order}/status`], ['PUT', `/staff/orders/${ids.order}/delivery-failure`]]) {
    assert.equal((await request(path, { method, body: method === 'GET' ? undefined : { orderStatus: 'Đang giao', reason: 'Old client' } })).status, 403);
  }
});

test('admin cannot assign orders to consultants through the retired API', async t => {
  install(t); t.mock.method(Order, 'findById', () => assert.fail('Retired assignment must not read or modify an order'));
  assert.equal((await request(`/orders/${ids.order}/assignment`, { method: 'PUT', body: { staffId: ids.worker, version: 0 }, auth: token('customer') })).status, 410);
});

test('delivery failure controller itself rejects a consultant even if an old order was assigned to them', async t => {
  t.mock.method(Order, 'findById', () => assert.fail('No order reads from consultant'));
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await recordDeliveryFailure({ user: worker(), accountType: 'staff', params: { id: ids.order }, body: { reason: 'Not permitted' } }, response);
  assert.equal(response.statusCode, 403);
});

test('inventory filters bind size/color/available quantity to the same variant and escape literal searches', () => {
  const { filter } = consultationInventoryQuery({ recommendable: 'true', size: '40', color: 'Trắng', search: 'Nike(1)', minPrice: '500000', maxPrice: '1000000' });
  assert.equal(filter.isHidden.$ne, true); assert.equal(filter.countInStock.$gt, 0);
  const variant = filter.$and[1].$or[0].variants.$elemMatch;
  assert.equal(variant.size, 40); assert.equal(variant.quantity.$gt, 0); assert.equal(variant.color.$regex, 'Trắng');
  assert.equal(filter.$and[0].$or[0].name.$regex, 'Nike\\(1\\)'); assert(filter.$expr.$and.length === 2);
  assert.equal(canRecommendProduct({ countInStock: 4, variants: [{ quantity: 0 }] }), false);
  assert.equal(canRecommendProduct({ countInStock: 4, isHidden: true }), false);
  assert.equal(canRecommendProduct({ countInStock: 4 }), true);
});

test('invalid size, budget, paging and recommendation flags fail before inventory lookup', async t => {
  install(t); t.mock.method(Product, 'find', () => assert.fail('Invalid filter must not query inventory'));
  for (const suffix of ['?page=-1', '?size=40.25', '?minPrice=100&maxPrice=50', '?recommendable=maybe', '?minPrice=-1']) assert.equal((await request('/staff/inventory' + suffix)).status, 400);
});

test('staff self-service and admin creation cannot smuggle role, authority or arbitrary fields', async t => {
  install(t); t.mock.method(Staff, 'exists', async () => false); let created;
  t.mock.method(Staff, 'create', async body => { created = body; return { ...body, _id: ids.worker }; });
  const payload = { email: 'new@example.test', name: 'Nhân viên mới', phone: '0901234567', password: 'TestOnly!123' };
  assert.equal((await request('/staff', { method: 'POST', body: { ...payload, isAdmin: true }, auth: token('customer') })).status, 400);
  assert.equal((await request('/staff', { method: 'POST', body: payload, auth: token('customer') })).status, 201);
  assert.equal(created.isAdmin, false); assert.equal(created.role, 'staff');
  assert.equal((await request('/staff/profile', { method: 'PUT', body: { isAdmin: true } })).status, 400);
  assert.equal((await request('/staff/profile', { method: 'PUT', body: { role: 'admin' } })).status, 400);
});

test('disabled staff sessions fail before reading inventory or consultation', async t => {
  install(t, worker({ isActive: false })); assert.equal((await request('/staff/inventory')).status, 401); assert.equal((await request('/chats/inbox')).status, 401);
});

test('inventory reads expose live discounted prices, include hidden stock for viewing, and do not recommend hidden shoes', async t => {
  install(t); let filter;
  t.mock.method(Product, 'find', input => { filter = input; return query([{ name: 'Giày', price: 200000, discountPercent: 25, isHidden: true, countInStock: 3 }]); });
  t.mock.method(Product, 'countDocuments', async () => 1);
  const result = await request('/staff/inventory'); assert.equal(result.status, 200); assert.deepEqual(filter, { isArchived: { $ne: true } });
  assert.equal(result.body.items[0].salePrice, 150000); assert.equal(result.body.items[0].canRecommend, false);
  assert.equal((await request('/staff/inventory', { auth: token('customer') })).status, 200);
});
