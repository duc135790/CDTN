const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
let StaffWorkspace, StaffProfile, AdminStaff, StaffRoute, ShoppingRoute, ConsultationProductCard;
const plugin = { name: 'consultation-staff-fixtures', setup(build) {
  build.onResolve({ filter: /LazyChatInbox$|^\.\.\/components\/ConsultationProducts$|^react(?:\/jsx-runtime)?$|^react-router-dom$|context\/AuthContext|utils\/api|\.css$/ }, args => ({ path: args.path, namespace: 'fixture' }));
  build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => {
    if (name.endsWith('LazyChatInbox')) return { contents: 'export default "chat-inbox";' };
    if (name === '../components/ConsultationProducts') return { contents: 'export default "inventory-view";' };
    if (name.endsWith('.css')) return { contents: '' };
    if (name === 'react') return { contents: 'export const useState=v=>globalThis.__staffUI.state(v);export const useRef=v=>({current:v});export const useEffect=fn=>globalThis.__staffUI.effects.push(fn);' };
    if (name === 'react/jsx-runtime') return { contents: 'export const Fragment="fragment";export const jsx=(type,props)=>({type,props:props||{}});export const jsxs=jsx;' };
    if (name === 'react-router-dom') return { contents: 'export const Navigate="navigate";export const Outlet="outlet";export const useLocation=()=>({pathname:"/staff",search:"?tab=inventory"});export const useSearchParams=()=>[new URLSearchParams(globalThis.__staffUI.search),value=>{globalThis.__staffUI.search=new URLSearchParams(value).toString()}];' };
    if (name.includes('AuthContext')) return { contents: 'export const useAuth=()=>globalThis.__staffUI.auth;' };
    return { contents: 'export const staffAPI=new Proxy({},{get:(_,name)=>(...args)=>globalThis.__staffUI.request(name,args)});' };
  });
} };
const load = async file => {
  const built = await esbuild.build({ entryPoints: [path.join(__dirname, '..', 'src', file)], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', plugins: [plugin], logLevel: 'silent' });
  const module = { exports: {} }; new Function('module', 'exports', built.outputFiles[0].text)(module, module.exports); return module.exports;
};
before(async () => {
  ({ default: StaffWorkspace, StaffProfile } = await load('pages/StaffWorkspace.jsx'));
  ({ default: AdminStaff } = await load('components/AdminStaff.jsx'));
  ({ default: StaffRoute, ShoppingRoute } = await load('components/StaffRoute.jsx'));
  ({ ConsultationProductCard } = await load('components/ConsultationProducts.jsx'));
});
const setup = (values = []) => {
  const h = { values, cursor: 0, effects: [], search: '', calls: [], auth: { user: { _id: 'staff-a', name: 'Advisor', accountType: 'staff' }, loading: false },
    state(initial) { const index = this.cursor++; if (!(index in this.values)) this.values[index] = typeof initial === 'function' ? initial() : initial; return [this.values[index], value => { this.values[index] = typeof value === 'function' ? value(this.values[index]) : value; }]; },
    async request(name, args) { this.calls.push({ name, args }); return { data: [] }; },
  };
  globalThis.__staffUI = h; return h;
};
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const text = value => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(text).join(' ') : typeof value === 'object' ? text(value.props?.children) : String(value);

test('consultation workspace has exactly chat, stock and profile; chat is the default', () => {
  setup(); const tree = StaffWorkspace(); const nav = nodes(tree).find(node => node.type === 'nav');
  assert.deepEqual(nodes(nav).filter(node => node.type === 'button').map(text), ['Tư vấn khách hàng', 'Tra cứu tồn kho', 'Tài khoản']);
  assert(nodes(tree).some(node => node.type === 'chat-inbox')); assert(!text(tree).includes('Đơn được phân công'));
});

test('earlier order URLs fall back to consultation without loading order information', () => {
  const h = setup(); h.search = 'tab=orders'; const tree = StaffWorkspace();
  assert(nodes(tree).some(node => node.type === 'chat-inbox')); assert.equal(h.calls.length, 0);
});

test('inventory tab exposes the consultation inventory view and no order controls', () => {
  const h = setup(); h.search = 'tab=inventory'; const tree = StaffWorkspace();
  assert(nodes(tree).some(node => node.type === 'inventory-view')); assert(!nodes(tree).some(node => node.type === 'chat-inbox'));
});

test('profile keeps personal fields and a single save action without repeating role instructions', () => {
  setup(); const tree = StaffProfile(); assert(text(tree).includes('Tài khoản nhân viên tư vấn'));
  assert(!text(tree).includes('Đơn hàng, thanh toán, giá bán'));
  assert.deepEqual(nodes(tree).filter(node => node.type === 'button').map(text), ['Lưu thông tin']);
});

test('admin staff management loads only employees and offers no order assignment', async () => {
  const h = setup(); h.auth.user.isAdmin = true; const tree = AdminStaff();
  assert(!text(tree).includes('Phân công đơn hàng')); assert(text(tree).includes('Nhân viên tư vấn'));
  await Promise.all(h.effects.map(fn => fn())); await Promise.resolve();
  assert.deepEqual(h.calls.map(call => call.name), ['list']);
});

test('stock product cards show actual color/size quantities and only choose available products', () => {
  const shoe = { _id: 'shoe-a', name: 'Running shoe', price: 1200000, salePrice: 900000, countInStock: 5, canRecommend: true, variants: [{ color: 'Trắng', size: 40, quantity: 0 }, { color: 'Đen', size: 41, quantity: 5 }] };
  const calls = []; let tree = ConsultationProductCard({ product: shoe, onChoose: value => calls.push(value) });
  assert(text(tree).includes('900.000₫')); assert.match(text(tree), /Size\s+40/); assert.match(text(tree), /Size\s+41/);
  nodes(tree).find(node => node.type === 'button').props.onClick(); assert.equal(calls[0]._id, 'shoe-a');
  tree = ConsultationProductCard({ product: { ...shoe, canRecommend: false }, onChoose: () => assert.fail('Unavailable shoe must not be selected') });
  const button = nodes(tree).find(node => node.type === 'button'); assert.equal(button.props.disabled, true); button.props.onClick();
});

test('workspace routes distinguish staff/customer and direct staff away from shopping', () => {
  const h = setup(); assert.equal(StaffRoute().type, 'outlet'); assert.equal(ShoppingRoute().props.to, '/staff');
  h.auth.user = { accountType: 'customer', isAdmin: true }; assert.equal(StaffRoute().props.to, '/login'); assert.equal(ShoppingRoute().type, 'outlet');
  h.auth.user = null; assert.equal(StaffRoute().props.to, '/login'); assert.deepEqual(StaffRoute().props.state, { from: '/staff?tab=inventory' });
});
