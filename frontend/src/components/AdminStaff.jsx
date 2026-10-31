import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffAPI } from '../utils/api';

const control = 'mt-2 w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2';
const primary = 'rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50';
const blank = { name: '', email: '', phone: '', password: '' };

export default function AdminStaff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  const lock = useRef(false);
  const account = useRef(user?._id);
  account.current = user?._id;
  useEffect(() => {
    const current = ++generation.current;
    setLoading(true);
    staffAPI.list().then(({ data }) => {
      if (current !== generation.current) return;
      setStaff(data);
    }).catch(error => { if (current === generation.current) setMessage({ ok: false, text: error.response?.data?.message || 'Không tải được danh sách nhân viên.' }); })
      .finally(() => { if (current === generation.current) setLoading(false); });
    return () => { generation.current += 1; };
  }, [refresh, user?._id]);
  const run = async (operation, success) => {
    if (lock.current || !user?.isAdmin) return false;
    lock.current = true; setBusy(true); setMessage(null);
    const current = generation.current; const owner = account.current;
    const active = () => current === generation.current && owner === account.current;
    try {
      await operation();
      if (!active()) return false;
      setMessage({ ok: true, text: success }); setRefresh(value => value + 1); return true;
    } catch (error) {
      if (active()) { setMessage({ ok: false, text: error.response?.data?.message || 'Chưa thực hiện được thao tác.' }); setRefresh(value => value + 1); }
      return false;
    } finally { lock.current = false; if (active()) setBusy(false); }
  };
  const save = async event => {
    event.preventDefault();
    const payload = { name: form.name.trim(), phone: form.phone.trim() };
    if (form.password) payload.password = form.password;
    const saved = await run(() => editing ? staffAPI.update(editing, payload) : staffAPI.create({ ...payload, email: form.email.trim() }), editing ? 'Đã cập nhật nhân viên; các phiên đăng nhập cũ đã được thu hồi.' : 'Đã tạo tài khoản nhân viên. Hãy cung cấp thông tin đăng nhập cho nhân viên.');
    if (saved) { setEditing(null); setForm(blank); }
  };
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Nhân viên tư vấn</h2><p className="mt-2 text-gray-600">Nhân viên đăng nhập tại <a href="/staff/login" className="font-semibold text-red-700 underline">/staff/login</a> để tư vấn, tra cứu tồn kho và chọn giày gợi ý cho khách.</p></div>
    {message && <p role={message.ok ? 'status' : 'alert'} className={`rounded-lg p-3 ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <form onSubmit={save} className="space-y-4 rounded-xl border border-gray-200 p-5">
        <h3 className="text-xl font-bold">{editing ? 'Chỉnh sửa nhân viên' : 'Tạo tài khoản nhân viên'}</h3>
        {[['name', 'Họ tên', 'text'], ['email', 'Email đăng nhập', 'email'], ['phone', 'Số điện thoại', 'tel'], ['password', editing ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu ban đầu', 'password']].map(([key, label, type]) => <label key={key} className="block font-medium">{label}<input name={key} type={type} className={control} autoComplete={type === 'password' ? 'new-password' : 'off'} maxLength={key === 'name' ? 100 : key === 'email' ? 254 : key === 'phone' ? 10 : undefined} minLength={key === 'password' ? 6 : undefined} disabled={busy || key === 'email' && Boolean(editing)} required={key !== 'password' || !editing} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
        <p className="text-sm text-gray-600">Quyền cố định: nhận/trả lời tư vấn, xem tồn theo màu/size và gửi giày gợi ý. Đơn hàng, thanh toán, giá bán và chỉnh kho do admin quản lý.</p>
        <div className="flex flex-wrap gap-3"><button className={primary} disabled={busy}>{busy ? 'Đang lưu...' : editing ? 'Lưu nhân viên' : 'Tạo nhân viên'}</button>{editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setForm(blank); }}>Hủy chỉnh sửa</button>}</div>
      </form>
      <section className="space-y-3"><h3 className="text-xl font-bold">Danh sách nhân viên</h3>
        {loading && <p role="status">Đang tải...</p>}
        {!loading && !staff.length && <p>Chưa có tài khoản nhân viên.</p>}
        {staff.map(person => <article key={person._id} className="rounded-xl border border-gray-200 p-4">
          <p className="font-bold">{person.name || person.email} · {person.isAdmin ? 'Admin cũ' : person.isActive ? 'Đang hoạt động' : 'Đã khóa'}</p><p className="break-all text-sm text-gray-600">{person.email} · {person.phone || 'Chưa có SĐT'}</p>
          {!person.isAdmin && <div className="mt-3 flex flex-wrap gap-4">
            <button type="button" className="font-semibold text-red-700" disabled={busy} onClick={() => { setEditing(person._id); setForm({ name: person.name || '', phone: person.phone || '', email: person.email, password: '' }); }}>Chỉnh sửa / đặt lại mật khẩu</button>
            <button type="button" className="font-semibold" disabled={busy} onClick={() => {
              if (!window.confirm(person.isActive ? 'Khóa tài khoản và thu hồi các phiên đăng nhập? Hãy chuyển các cuộc tư vấn đang phụ trách cho người khác.' : 'Mở lại tài khoản nhân viên?')) return;
              run(() => staffAPI.update(person._id, { isActive: !person.isActive }), person.isActive ? 'Đã khóa nhân viên. Vào Tư vấn khách hàng để chuyển các cuộc còn mở.' : 'Đã mở lại tài khoản nhân viên.');
            }}>{person.isActive ? 'Khóa tài khoản' : 'Mở tài khoản'}</button>
          </div>}
        </article>)}
      </section>
    </div>
    <button type="button" disabled={busy || loading} className="font-semibold text-red-700" onClick={() => setRefresh(value => value + 1)}>Tải lại danh sách nhân viên</button>
  </div>;
}
