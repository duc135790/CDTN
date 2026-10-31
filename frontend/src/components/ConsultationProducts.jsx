import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffAPI } from '../utils/api';
import { captureChatSession } from '../utils/chat';
import './chat.css';

const emptyFilters = { search: '', category: '', color: '', size: '', minPrice: '', maxPrice: '' };
const money = value => Number(value).toLocaleString('vi-VN') + '₫';

export function ConsultationProductCard({ product, onChoose, disabled = false }) {
  const variants = product.variants || [];
  return <article className="consult-stock-card">
    <div className="consult-stock-card__heading"><img src={product.image || '/shoe.svg'} alt="" /><div><h3>{product.name}</h3><p>{product.brand} · {product.category}</p><strong>{money(product.salePrice ?? product.price)}</strong>{product.isHidden && <small>Đang ẩn bán</small>}</div></div>
    <p className="consult-stock-total">Tổng tồn: <strong>{product.countInStock} đôi</strong></p>
    {variants.length ? <div className="consult-stock-variants" aria-label="Tồn theo màu và size">{variants.map((row, index) => <p key={index} className={row.quantity <= 0 ? 'is-empty' : ''}><span>{row.color} · Size {row.size}</span><strong>{row.quantity} đôi</strong></p>)}</div> : <p className="consult-stock-legacy">Kho chung · {product.color || 'Chưa có màu'} · Size {(product.sizes || []).join(', ') || 'Chưa có'}</p>}
    <div className="consult-stock-card__actions"><a href={`/products/${product._id}`} target="_blank" rel="noreferrer">Xem chi tiết ↗</a>{onChoose && <button type="button" disabled={disabled || !product.canRecommend} onClick={() => { if (!disabled && product.canRecommend) onChoose(product); }}>Chọn giày này</button>}</div>
  </article>;
}

export default function ConsultationProducts({ picker = false, onChoose }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [draft, setDraft] = useState(emptyFilters), [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1), [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState({ items: [], pages: 1, total: 0 }), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current, controller = new AbortController(), session = captureChatSession(user);
    const active = () => generation.current === current && session.current();
    setLoading(true); setError('');
    if (!session.current()) { setError('Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.'); setLoading(false); return () => { generation.current += 1; }; }
    staffAPI.inventory(page, { ...filters, ...(picker ? { recommendable: 'true' } : {}) }, { token: session.token, signal: controller.signal })
      .then(({ data }) => { if (active()) setResult(data); })
      .catch(failure => { if (active()) setError(failure.response?.data?.message || 'Chưa tải được danh sách giày. Vui lòng thử lại.'); })
      .finally(() => { if (active()) setLoading(false); });
    return () => { generation.current += 1; controller.abort(); };
  }, [page, filters, picker, refresh, user?._id, user?.accountType, token]);
  return <section className="consult-stock">
    {!picker && <><h2 className="text-2xl font-bold">Tra cứu tồn kho</h2><p className="mb-4 mt-2 text-gray-600">Xem số lượng theo màu và size. Để gửi giày cho khách, mở cuộc tư vấn và chọn “Chọn giày để gợi ý”.</p></>}
    {picker && <p className="consult-stock-note">Chỉ hiển thị giày đang bán và còn hàng. Chọn theo nhu cầu của khách rồi kiểm tra lời tư vấn trước khi gửi.</p>}
    <form className="consult-stock-filters" onSubmit={event => { event.preventDefault(); setPage(1); setFilters({ ...draft }); }}>
      {[['search', 'Tên, thương hiệu, phong cách', 'text', 'Nike, chạy bộ, sneaker...'], ['category', 'Loại giày', 'text', 'Sneaker, Giày da...'], ['color', 'Màu sắc', 'text', 'Trắng, Đen...'], ['size', 'Size giày', 'number', '40'], ['minPrice', 'Giá từ (đ)', 'number', '0'], ['maxPrice', 'Giá đến (đ)', 'number', '2000000']].map(([key, label, type, placeholder]) => <label key={key}>{label}<input name={key} value={draft[key]} type={type} min={key === 'size' ? 1 : type === 'number' ? 0 : undefined} max={key === 'size' ? 60 : undefined} step={key === 'size' ? 0.5 : type === 'number' ? 1 : undefined} maxLength={type === 'text' ? 100 : undefined} placeholder={placeholder} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
      <div><button type="submit" disabled={loading}>Tìm giày</button><button type="button" disabled={loading} onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1); setRefresh(value => value + 1); }}>Xóa bộ lọc</button></div>
    </form>
    {error && <p role="alert" className="consult-error">{error} <button type="button" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></p>}
    <div className="consult-stock-summary"><p>{loading ? 'Đang tìm giày...' : `${result.total} sản phẩm phù hợp`}</p><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Cập nhật tồn kho</button></div>
    {!loading && !result.items.length && !error && <p className="consult-empty">Chưa có giày phù hợp với bộ lọc. Hãy thử màu, size hoặc khoảng giá khác.</p>}
    <div className="consult-stock-grid" aria-busy={loading}>{result.items.map(product => <ConsultationProductCard key={product._id} product={product} disabled={loading || Boolean(error)} onChoose={onChoose} />)}</div>
    <div className="consult-stock-pages"><button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>← Trước</button><span>Trang {page}/{result.pages}</span><button type="button" disabled={loading || page >= result.pages} onClick={() => setPage(value => value + 1)}>Sau →</button></div>
  </section>;
}

export function ProductSuggestionPicker({ onChoose, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.querySelector('button')?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...(dialog.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]') || [])];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="consult-picker-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialog} className="consult-picker" role="dialog" aria-modal="true" aria-labelledby="consult-picker-title"><header><div><h2 id="consult-picker-title">Chọn giày để gợi ý</h2><p>Tìm đôi giày phù hợp với sở thích của khách hàng</p></div><button type="button" aria-label="Đóng chọn giày" onClick={onClose}>×</button></header><ConsultationProducts picker onChoose={onChoose} /></div></div>;
}
