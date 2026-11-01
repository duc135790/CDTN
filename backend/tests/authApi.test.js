import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import Customer from '../models/customerModel.js';
import Staff from '../models/staffModel.js';

const secret = 'unified-login-offline-test-secret';
const password = 'TestLogin!123';
let hash, server, baseUrl, readyState, previousReady, previousSecret;
let testTime = Date.now();
const query = value => ({ select() { return this; }, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });
const person = (Model = Customer, overrides = {}) => new Model({
  _id: Model === Staff ? '100000000000000000000002' : '100000000000000000000001',
  email: 'same@example.test', name: 'Test account', phone: '0901234567',
  password: hash, isAdmin: false, isActive: true, authVersion: 3, ...overrides,
});
const install = (t, customer = null, staff = null) => {
  for (const [Model, account] of [[Customer, customer], [Staff, staff]]) {
    t.mock.method(Model, 'findOne', async filter => { assert.deepEqual(filter, { email: 'same@example.test' }); return account; });
    t.mock.method(Model, 'findById', id => query(account && String(account._id) === String(id) ? account : null));
    t.mock.method(Model, 'create', () => assert.fail('Login must not create or migrate accounts'));
  }
};
const request = async (path = '/auth/login', { body, token, method = body ? 'POST' : 'GET' } = {}) => {
  const response = await fetch(baseUrl + '/api' + path, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
};
const credentials = overrides => ({ email: ' SAME@EXAMPLE.TEST ', password, ...overrides });
before(async () => {
  hash = await bcrypt.hash(password, 4);
  previousSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = secret;
  previousReady = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => readyState });
});
beforeEach(async t => {
  // Route middleware is shared across app instances; isolate each test's IP
  // rate-limit window without disabling the real limiter under test.
  testTime += 16 * 60 * 1000;
  t.mock.method(Date, 'now', () => testTime);
  readyState = 1; server = createServer(createApp());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
after(() => {
  if (previousReady) Object.defineProperty(mongoose.connection, 'readyState', previousReady); else delete mongoose.connection.readyState;
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});

test('one login route recognizes customers, consultants and both legacy admin account types', async t => {
  for (const [Model, isAdmin, role] of [[Customer, false, 'customer'], [Staff, false, 'staff'], [Customer, true, 'admin'], [Staff, true, 'admin']]) {
      t.mock.restoreAll();
      const account = person(Model, { isAdmin, role: 'untrusted old label', salary: 999 });
      install(t, Model === Customer ? account : null, Model === Staff ? account : null);
      const result = await request('/auth/login', { body: credentials({ isAdmin: true, role: 'admin', accountType: 'staff' }) });
      assert.equal(result.status, 200); assert.equal(result.body.role, role);
      assert.equal(result.body.accountType, Model === Staff ? 'staff' : 'customer'); assert.equal(result.body.isAdmin, isAdmin);
      assert.equal(result.headers.get('cache-control'), 'no-store');
      const claims = jwt.verify(result.body.token, secret);
      assert.equal(claims.id, String(account._id)); assert.equal(claims.accountType, result.body.accountType); assert.equal(claims.authVersion, 3);
      assert.equal(claims.isAdmin, undefined); assert.equal(claims.role, undefined);
      for (const key of ['password', 'salary', 'authVersion', 'resetPasswordToken', 'cart', 'checkoutLock']) assert.equal(result.body[key], undefined);
      const profile = await request(Model === Staff ? '/staff/profile' : '/customers/profile', { token: result.body.token });
      assert.equal(profile.status, 200); assert.equal(profile.body.role, role); assert.equal(profile.body.accountType, result.body.accountType);
      if (Model === Staff) assert.deepEqual(result.body.permissions, ['inventory:read', 'chat:consult', 'products:recommend']);
  }
});

test('identical emails with different passwords select only the account whose password matches', async t => {
  const customer = person(); const staff = person(Staff, { password: await bcrypt.hash('OtherPassword!123', 4) });
  install(t, customer, staff);
  const buyer = await request('/auth/login', { body: credentials() });
  assert.equal(buyer.status, 200); assert.equal(buyer.body.accountType, 'customer');
  const advisor = await request('/auth/login', { body: credentials({ password: 'OtherPassword!123' }) });
  assert.equal(advisor.status, 200); assert.equal(advisor.body.accountType, 'staff');
});

test('identical credentials in both collections are rejected instead of silently granting the wrong account', async t => {
  install(t, person(), person(Staff, { isAdmin: true }));
  const result = await request('/auth/login', { body: credentials() });
  assert.equal(result.status, 409); assert.match(result.body.message, /hai tài khoản/); assert.equal(result.body.token, undefined);
});

test('unknown email and wrong passwords produce the same response without revealing account type', async t => {
  install(t);
  const unknown = await request('/auth/login', { body: credentials() });
  t.mock.restoreAll(); install(t, person(), person(Staff));
  const wrong = await request('/auth/login', { body: credentials({ password: 'wrong' }) });
  assert.equal(unknown.status, 401); assert.deepEqual(wrong.body, unknown.body); assert.equal(wrong.status, 401);
});

test('disabled accounts cannot log in through the common page', async t => {
  for (const Model of [Customer, Staff]) {
      t.mock.restoreAll();
      const account = person(Model, { isActive: false }); install(t, Model === Customer ? account : null, Model === Staff ? account : null);
      const result = await request('/auth/login', { body: credentials() });
      assert.equal(result.status, 403); assert.equal(result.body.token, undefined);
  }
});

test('a disabled account with another password does not hide the active matching account', async t => {
  install(t, person(Customer, { isActive: false, password: await bcrypt.hash('DisabledPassword!123', 4) }), person(Staff));
  const result = await request('/auth/login', { body: credentials() });
  assert.equal(result.status, 200); assert.equal(result.body.role, 'staff');
});

test('malformed email/password inputs fail before database queries', async t => {
  t.mock.method(Customer, 'findOne', () => assert.fail('Invalid login must not query customer'));
  t.mock.method(Staff, 'findOne', () => assert.fail('Invalid login must not query staff'));
  for (const body of [credentials({ email: { $ne: '' } }), credentials({ email: 'invalid' }), credentials({ password: null }), credentials({ password: { $ne: '' } }), credentials({ password: '' }), credentials({ password: 'x'.repeat(73) })]) {
    assert.equal((await request('/auth/login', { body })).status, 400);
  }
});

test('the shared endpoint still requires the database and enforces its login rate limit', async t => {
  install(t);
  readyState = 0; assert.equal((await request('/auth/login', { body: credentials() })).status, 503); readyState = 1;
  for (let index = 0; index < 20; index++) assert.equal((await request('/auth/login', { body: credentials() })).status, 401);
  const limited = await request('/auth/login', { body: credentials() });
  assert.equal(limited.status, 429); assert(Number(limited.headers.get('retry-after')) > 0);
});

test('tokens from the common endpoint retain role restrictions and password/session revocation', async t => {
  const account = person(Staff); install(t, null, account);
  const loggedIn = await request('/auth/login', { body: credentials() }); const token = loggedIn.body.token;
  assert.equal((await request('/customers/cart', { token })).status, 403);
  assert.equal((await request('/orders', { token })).status, 403);
  assert.equal((await request('/staff', { token })).status, 403);
  account.authVersion += 1;
  assert.equal((await request('/staff/profile', { token })).status, 401);
});

test('existing explicit login endpoints remain compatible and return the same account metadata', async t => {
  install(t, person(), person(Staff));
  for (const [path, accountType] of [['/customers/login', 'customer'], ['/staff/login', 'staff']]) {
    const result = await request(path, { body: credentials() });
    assert.equal(result.status, 200); assert.equal(result.body.accountType, accountType); assert.equal(result.body.role, accountType);
  }
});
