const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
let Login, AdminRoute, loginDestination;
const plugin = { name: 'unified-login-fixtures', setup(build) {
  build.onResolve({ filter: /^react(?:\/jsx-runtime)?$|^react-router-dom$|^react-icons\/fa$|context\/AuthContext|components\/AuthLayout$/ }, args => ({ path: args.path, namespace: 'fixture' }));
  build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => {
    if (name === 'react') return { contents: 'export const useState=v=>globalThis.__loginTest.state(v);' };
    if (name === 'react/jsx-runtime') return { contents: 'export const jsx=(type,props)=>({type,props:props||{}});export const jsxs=jsx;' };
    if (name === 'react-router-dom') return { contents: 'export const Link="link",Navigate="navigate",Outlet="outlet";export const useLocation=()=>globalThis.__loginTest.location;export const useNavigate=()=> (...args)=>globalThis.__loginTest.navigation.push(args);' };
    if (name === 'react-icons/fa') return { contents: 'export const FaUser="user-icon",FaLock="lock-icon";' };
    if (name.includes('AuthLayout')) return { contents: 'export default "auth-layout";' };
    return { contents: 'export const useAuth=()=>globalThis.__loginTest.auth;' };
  });
} };
const load = async file => {
  const built = await esbuild.build({ entryPoints: [path.join(__dirname, '..', 'src', file)], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', plugins: [plugin], logLevel: 'silent' });
  const module = { exports: {} }; new Function('module', 'exports', built.outputFiles[0].text)(module, module.exports); return module.exports;
};
before(async () => {
  ({ default: Login } = await load('pages/Login.jsx'));
  ({ default: AdminRoute } = await load('components/AdminRoute.jsx'));
  ({ loginDestination } = await load('utils/loginDestination.js'));
});
const setup = (user = { accountType: 'customer', isAdmin: false }, from) => {
  const h = { values: [{ email: 'person@example.test', password: 'TestPassword!123' }, '', false], cursor: 0, navigation: [], calls: [],
    location: { pathname: '/login', search: '', state: { from } },
    state(initial) { const index = this.cursor++; if (!(index in this.values)) this.values[index] = initial; return [this.values[index], value => { this.values[index] = value; }]; },
    auth: { user: null, loading: false, async login(...args) { h.calls.push(args); return h.result; } },
    result: { success: true, user },
    render() { this.cursor = 0; return Login(); },
  }; globalThis.__loginTest = h; return h;
};
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const text = value => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(text).join(' ') : typeof value === 'object' ? text(value.props?.children) : String(value);
const submit = tree => nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });

test('the common page offers one email/password form without a role selector or a second login link', () => {
  const tree = setup().render(); const all = nodes(tree);
  assert.equal(all.filter(node => node.type === 'form').length, 1);
  assert.deepEqual(all.filter(node => node.type === 'input').map(node => node.props.type), ['email', 'password']);
  assert.equal(all.filter(node => node.type === 'select' || node.props?.type === 'radio').length, 0);
  assert(!all.some(node => node.props?.to === '/staff/login')); assert(text(tree).includes('nhân viên và quản trị viên'));
});

test('the same form recognizes all account types and navigates using the authenticated profile', async () => {
  for (const [user, destination] of [[{ accountType: 'customer', isAdmin: false }, '/'], [{ accountType: 'staff', isAdmin: false }, '/staff'], [{ accountType: 'customer', isAdmin: true }, '/admin'], [{ accountType: 'staff', isAdmin: true }, '/admin']]) {
    const h = setup(user); await submit(h.render());
    assert.deepEqual(h.calls, [['person@example.test', 'TestPassword!123']]);
    assert.deepEqual(h.navigation, [[destination, { replace: true }]]); assert.equal(h.values[2], false);
  }
});

test('checkout and staff bookmarks resume after login when the account can use the requested page', async () => {
  for (const [user, from] of [[{ accountType: 'customer' }, '/checkout?voucher=SAVED'], [{ accountType: 'staff' }, '/staff?tab=inventory'], [{ isAdmin: true }, '/admin?tab=chat']]) {
    const h = setup(user, from); await submit(h.render()); assert.equal(h.navigation[0][0], from);
  }
});

test('invalid credentials and locked/ambiguous accounts show the backend message without navigating', async () => {
  for (const message of ['Email hoặc mật khẩu không chính xác', 'Tài khoản đã bị vô hiệu hóa', 'Email và mật khẩu trùng ở hai tài khoản']) {
    const h = setup(); h.result = { success: false, message }; await submit(h.render());
    assert.equal(h.navigation.length, 0); assert.equal(h.values[2], false);
    assert.equal(text(nodes(h.render()).find(node => node.props?.role === 'alert')), message);
  }
});

test('submit is disabled while login is pending and a failed attempt keeps email/password available to correct', async () => {
  const h = setup(); let finish; h.auth.login = () => new Promise(resolve => { finish = resolve; });
  const pending = submit(h.render()); assert(nodes(h.render()).find(node => node.props?.type === 'submit').props.disabled);
  finish({ success: false, message: 'Try again' }); await pending;
  assert.equal(h.values[0].email, 'person@example.test'); assert.equal(h.values[0].password, 'TestPassword!123');
  const email = nodes(h.render()).find(node => node.props?.name === 'email');
  email.props.onChange({ target: { name: 'email', value: 'correct@example.test' } }); assert.equal(h.values[1], '');
});

test('redirects reject external URLs, authentication loops and pages outside the signed-in role', () => {
  const buyer = { accountType: 'customer' }, worker = { accountType: 'staff' }, admin = { accountType: 'customer', isAdmin: true };
  for (const bad of ['https://evil.test', '//evil.test', '/\\evil.test', '/\nevil.test', '/login', '/login?x=1', '/staff/login', '/register', '/forgot-password', '/reset-password/token', null, {}]) {
    assert.equal(loginDestination(buyer, bad), '/'); assert.equal(loginDestination(worker, bad), '/staff'); assert.equal(loginDestination(admin, bad), '/admin');
  }
  assert.equal(loginDestination(buyer, '/admin'), '/'); assert.equal(loginDestination(buyer, '/staff'), '/');
  assert.equal(loginDestination(worker, '/checkout'), '/staff'); assert.equal(loginDestination(worker, '/admin'), '/staff');
  assert.equal(loginDestination(admin, '/staff'), '/admin'); assert.equal(loginDestination(buyer, '/products/shoe-1'), '/products/shoe-1');
});

test('admin bookmarks use the common login and continue enforcing role access afterwards', () => {
  const h = setup(); h.location = { pathname: '/admin', search: '?tab=staff' };
  let tree = AdminRoute(); assert.equal(tree.props.to, '/login'); assert.deepEqual(tree.props.state, { from: '/admin?tab=staff' });
  h.auth.user = { isAdmin: true }; assert.equal(AdminRoute().type, 'outlet');
  h.auth.user = { accountType: 'staff' }; assert.equal(AdminRoute().props.to, '/staff');
  h.auth.user = { accountType: 'customer' }; assert.equal(AdminRoute().props.to, '/');
});
