import test from 'node:test';
import assert from 'node:assert/strict';
import Staff from '../models/staffModel.js';
import Order from '../models/orderModel.js';
import { setupIntegration } from './setup.js';

test('consultation-only staff permissions and filtered inventory with real HTTP and owned MongoDB', { timeout: 120000 }, async t => {
  const ctx = await setupIntegration(t);
  const admin = await ctx.createCustomer({ isAdmin: true }), buyer = await ctx.createCustomer(), worker = await ctx.createStaff();
  const adminToken = await ctx.login(admin), buyerToken = await ctx.login(buyer), workerToken = await ctx.loginStaff(worker);
  const product = await ctx.createProduct();
  const api = (method, path, token, body) => ctx.request(method, path, { token, body });

  await t.test('admin provisions consultation accounts; login/profile restores only advisory permissions', async () => {
    const body = { name: 'New Advisor', email: 'advisor-created@example.test', phone: '0901234567', password: 'IntegrationOnly!123' };
    assert.equal((await api('POST', '/api/staff', buyerToken, body)).status, 403);
    assert.equal((await api('POST', '/api/staff', adminToken, { ...body, isAdmin: true })).status, 400);
    const created = await api('POST', '/api/staff', adminToken, body); assert.equal(created.status, 201);
    assert.equal(created.body.role, 'staff'); assert.equal(created.body.password, undefined);
    assert.deepEqual(created.body.permissions, ['inventory:read', 'chat:consult', 'products:recommend']);
    assert.equal((await api('GET', '/api/staff/inventory', buyerToken)).status, 403);
    assert.equal((await api('GET', '/api/staff/inventory', adminToken)).status, 200);
    assert.notEqual((await Staff.findById(created.body._id)).password, body.password);
    const login = await api('POST', '/api/staff/login', undefined, { email: body.email, password: body.password }); assert.equal(login.status, 200);
    assert.equal((await api('GET', '/api/staff/profile', login.body.token)).body.accountType, 'staff');
    assert.equal((await api('PUT', '/api/staff/profile', login.body.token, { role: 'admin' })).status, 400);
  });

  await t.test('even previously assigned orders remain inaccessible to staff; admin keeps order processing', async () => {
    const order = await Order.create({
      user: buyer._id, assignedStaff: worker._id,
      orderItems: [{ product: product._id, name: product.name, quantity: 1, price: 200000, image: product.image, size: 40, color: 'Trắng' }],
      shippingAddress: { name: 'Test Buyer', phone: '0901234567', address: '1 Test Street', city: 'Test City' },
      itemsPrice: 200000, shippingPrice: 30000, totalPrice: 230000, paymentMethod: 'COD',
    });
    const id = String(order._id);
    for (const path of ['/api/staff/orders', `/api/orders/${id}`]) assert.equal((await api('GET', path, workerToken)).status, 403);
    for (const [path, body] of [
      [`/api/staff/orders/${id}/status`, { orderStatus: 'Đã xác nhận' }], [`/api/staff/orders/${id}/delivery-failure`, { reason: 'Not permitted' }],
      ...['payment', 'refund', 'cancel', 'deliver', 'delivery-return', 'status'].map(suffix => [`/api/orders/${id}/${suffix}`, { orderStatus: 'Đang giao', isPaid: true }]),
    ]) assert.equal((await api('PUT', path, workerToken, body)).status, 403);
    const unchanged = await Order.findById(id); assert.equal(unchanged.orderStatus, 'Đang xử lý'); assert.equal(unchanged.isPaid, false); assert.equal(unchanged.activity?.length || 0, 0);
    assert.equal((await api('PUT', `/api/orders/${id}/assignment`, adminToken, { staffId: String(worker._id), version: 0 })).status, 410);
    assert.equal((await api('PUT', `/api/orders/${id}/status`, adminToken, { orderStatus: 'Đã xác nhận' })).status, 200);
  });

  await t.test('advisory search filters color/size on one stocked variant and applies discounted budgets', async () => {
    const match = await ctx.createProduct({ name: 'Advice Match', price: 1200000, discountPercent: 25, variants: [{ color: 'Trắng', size: 40, quantity: 3 }, { color: 'Đen', size: 41, quantity: 4 }] });
    await ctx.createProduct({ name: 'Advice Cross', price: 1200000, discountPercent: 25, variants: [{ color: 'Trắng', size: 41, quantity: 3 }, { color: 'Đen', size: 40, quantity: 4 }] });
    await ctx.createProduct({ name: 'Advice Empty Variant', price: 1200000, discountPercent: 25, variants: [{ color: 'Trắng', size: 40, quantity: 0 }, { color: 'Đen', size: 41, quantity: 4 }] });
    await ctx.createProduct({ name: 'Advice Hidden', price: 1200000, discountPercent: 25, isHidden: true });
    const suffix = '?recommendable=true&search=Advice&size=40&color=' + encodeURIComponent('Trắng') + '&minPrice=850000&maxPrice=950000';
    const results = await api('GET', '/api/staff/inventory' + suffix, workerToken); assert.equal(results.status, 200);
    assert.deepEqual(results.body.items.map(row => row._id), [String(match._id)]);
    assert.equal(results.body.items[0].salePrice, 900000); assert.equal(results.body.items[0].canRecommend, true);
    const inventory = await api('GET', '/api/staff/inventory?search=Advice', workerToken); assert.equal(inventory.body.items.length, 4);
    assert.equal(inventory.body.items.find(row => row.name === 'Advice Hidden').canRecommend, false);
    const rounded = await ctx.createProduct({ name: 'Advice Rounding', price: 1001, discountPercent: 50 });
    const exact = await api('GET', '/api/staff/inventory?recommendable=true&search=Rounding&minPrice=500&maxPrice=500', workerToken);
    assert.equal(exact.status, 200); assert.equal(exact.body.items[0]._id, String(rounded._id)); assert.equal(exact.body.items[0].salePrice, 500);
  });

  await t.test('locking/resetting staff revokes old sessions while self-service remains available', async () => {
    assert.equal((await api('PUT', `/api/staff/${worker._id}`, adminToken, { isActive: false })).status, 200);
    assert.equal((await api('GET', '/api/staff/inventory', workerToken)).status, 401);
    assert.equal((await api('PUT', `/api/staff/${worker._id}`, adminToken, { isActive: true, password: 'ResetIntegration!123' })).status, 200);
    assert.equal((await api('GET', '/api/staff/profile', workerToken)).status, 401);
    const login = await api('POST', '/api/staff/login', undefined, { email: worker.email, password: 'ResetIntegration!123' }); assert.equal(login.status, 200);
    const changed = await api('PUT', '/api/staff/profile', login.body.token, { currentPassword: 'ResetIntegration!123', password: 'ChangedIntegration!123', name: 'Advisor Updated' }); assert.equal(changed.status, 200);
    assert.equal((await api('GET', '/api/staff/profile', login.body.token)).status, 401);
    assert.equal((await api('GET', '/api/staff/inventory', changed.body.token)).status, 200);
    assert.equal((await api('PUT', `/api/products/${product._id}/stock`, changed.body.token, { countInStock: 999 })).status, 403);
  });
});
