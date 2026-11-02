import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatInbox from '../components/LazyChatInbox';
import ConsultationProducts from '../components/ConsultationProducts';

const inputClass = 'w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2';
const buttonClass = 'rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50';

export function StaffProfile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', currentPassword: '', password: '' });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(null);
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const submit = async event => {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(null);
    const payload = { name: form.name, phone: form.phone };
    if (form.password) Object.assign(payload, { currentPassword: form.currentPassword, password: form.password });
    const result = await updateProfile(payload);
    if (alive.current && !result.stale) {
      setMessage({ ok: result.success, text: result.success ? 'Đã cập nhật tài khoản nhân viên.' : result.message });
      if (result.success) setForm(previous => ({ ...previous, password: '', currentPassword: '' }));
    }
    lock.current = false; if (alive.current) setBusy(false);
  };
  return <form onSubmit={submit} className="shop-panel mx-auto max-w-2xl space-y-5 rounded-xl bg-white p-6">
    <h2 className="text-xl font-bold">Tài khoản nhân viên tư vấn</h2><p>{user.email}</p>
    {message && <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-green-700' : 'text-red-700'}>{message.text}</p>}
    {[['name', 'Họ tên', 'text'], ['phone', 'Số điện thoại', 'tel'], ['currentPassword', 'Mật khẩu hiện tại (khi đổi mật khẩu)', 'password'], ['password', 'Mật khẩu mới (để trống nếu giữ nguyên)', 'password']].map(([key, label, type]) => <label key={key} className="block font-medium">{label}<input className={`${inputClass} mt-2`} type={type} autoComplete={type === 'password' ? key === 'password' ? 'new-password' : 'current-password' : key === 'phone' ? 'tel' : 'name'} required={key === 'name' || key === 'phone' || key === 'currentPassword' && Boolean(form.password)} minLength={key === 'password' ? 6 : undefined} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
    <button className={buttonClass} disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thông tin'}</button>
  </form>;
}

export default function StaffWorkspace() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = ['chat', 'inventory', 'profile'].includes(params.get('tab')) ? params.get('tab') : 'chat';
  return <div className="container mx-auto px-4 py-8 shop-page">
    <p className="shop-eyebrow">SHOE STORE · NHÂN VIÊN TƯ VẤN</p><h1 className="mb-2 text-3xl font-bold">Không gian tư vấn</h1>
    <p className="mb-6 text-gray-600">Xin chào, {user.name || user.email}</p>
    <nav aria-label="Chức năng nhân viên" className="mb-6 flex flex-wrap gap-3">{[['chat', 'Tư vấn khách hàng'], ['inventory', 'Tra cứu tồn kho'], ['profile', 'Tài khoản']].map(([value, label]) => <button type="button" key={value} aria-current={tab === value ? 'page' : undefined} className={tab === value ? buttonClass : 'rounded-lg border border-gray-300 bg-white px-4 py-2'} onClick={() => setParams({ tab: value })}>{label}</button>)}</nav>
    {tab === 'chat' ? <ChatInbox key={user._id} /> : tab === 'inventory' ? <ConsultationProducts key={user._id} /> : <StaffProfile key={user._id} />}
  </div>;
}
