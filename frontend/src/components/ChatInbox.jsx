import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatAPI, staffAPI } from '../utils/api';
import { captureChatSession, ownsChat, canReplyChat } from '../utils/chat';
import useChatThread from '../hooks/useChatThread';
import ChatThread from './ChatThread';
import './chat.css';

function AdvisorThread({ selected, onChanged, staff }) {
  const { user } = useAuth();
  const allowed = user.isAdmin || ownsChat(user, selected);
  const thread = useChatThread({ conversationId: selected._id, enabled: allowed });
  const chat = thread.conversation && thread.conversation.revision >= selected.revision ? thread.conversation : selected;
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [target, setTarget] = useState('');
  const alive = useRef(true), lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const action = async type => {
    if (lock.current || thread.sending) return;
    const session = captureChatSession(user); if (!session.current()) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const options = { token: session.token };
      const { data } = type === 'claim' ? await chatAPI.claim(chat._id, chat.revision, options) : type === 'close' ? await chatAPI.close(chat._id, chat.revision, options) : await chatAPI.assign(chat._id, type === 'self' ? 'self' : type === 'release' ? null : target, chat.revision, options);
      if (alive.current && session.current()) onChanged(data);
    } catch (failure) { if (alive.current && session.current()) { setError(failure.response?.data?.message || 'Cuộc trò chuyện vừa thay đổi. Vui lòng tải lại hộp thư.'); onChanged(); } }
    finally { lock.current = false; if (alive.current && session.current()) setBusy(false); }
  };
  const own = ownsChat(user, chat);
  return <section className="consult-inbox__thread" aria-label={`Tư vấn cho ${chat.customerName}`}>
    <header className="consult-inbox__thread-header"><div><h3>{chat.customerName}</h3><p>{chat.state === 'closed' ? 'Đã kết thúc' : chat.advisorName ? `Phụ trách: ${chat.advisorName}` : 'Đang chờ nhân viên tiếp nhận'}</p></div>
      {chat.state === 'open' && !chat.assignedTo && <button type="button" disabled={busy} onClick={() => action('claim')}>Nhận tư vấn</button>}
      {chat.state === 'open' && user.isAdmin && chat.assignedTo && !own && <button type="button" disabled={busy} onClick={() => action('self')}>Chuyển về tôi</button>}
      {chat.state === 'open' && (own || user.isAdmin) && <button type="button" className="consult-secondary" disabled={busy || thread.sending} onClick={() => { if (window.confirm('Kết thúc phiên tư vấn? Lịch sử vẫn được giữ; khách gửi tin mới sẽ vào hàng chờ.')) action('close'); }}>Kết thúc</button>}
    </header>
    {user.isAdmin && chat.state === 'open' && <div className="consult-assignment"><label>Chuyển cho nhân viên<select aria-label="Chọn nhân viên tư vấn" value={target} onChange={event => setTarget(event.target.value)} disabled={busy}><option value="">Chọn nhân viên đang hoạt động</option>{staff.filter(person => person.isActive && !person.isAdmin).map(person => <option key={person._id} value={person._id}>{person.name || person.email}</option>)}</select></label><button type="button" disabled={busy || !target || thread.sending} onClick={() => action('assign')}>Chuyển</button>{chat.assignedTo && <button type="button" disabled={busy || thread.sending} onClick={() => action('release')}>Về hàng chờ</button>}</div>}
    {error && <p role="alert" className="consult-error">{error}</p>}
    {allowed ? <ChatThread thread={thread} canReply={canReplyChat(user, chat) && !busy} /> : <div className="consult-queue-preview"><p>{chat.lastMessage}</p><p>Nhận tư vấn để xem lịch sử và trả lời nhu cầu của khách hàng.</p></div>}
  </section>;
}

export default function ChatInbox() {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [view, setView] = useState(user.isAdmin ? 'all' : 'waiting'), [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], pages: 1, total: 0 }), [selected, setSelected] = useState(null);
  const [staff, setStaff] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current, session = captureChatSession(user), controller = new AbortController();
    let busy = false;
    const active = () => generation.current === current && session.current();
    const load = async () => {
      if (busy || !active() || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const { data } = await chatAPI.inbox(view, page, { token: session.token, signal: controller.signal });
        if (!active()) return;
        setResult(data); setError('');
        setSelected(previous => {
          if (!previous) return previous;
          const latest = data.items.find(item => item._id === previous._id);
          if (latest) return latest;
          return view === 'mine' || view === 'waiting' && !ownsChat(user, previous) ? null : previous;
        });
      } catch (failure) { if (active()) setError(failure.response?.data?.message || 'Chưa tải được hộp thư tư vấn.'); }
      finally { busy = false; if (active()) setLoading(false); }
    };
    setLoading(true); load(); const timer = setInterval(load, 5000); document.addEventListener('visibilitychange', load);
    return () => { generation.current += 1; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [view, page, refresh, user._id, user.accountType, token]);
  useEffect(() => {
    if (!user.isAdmin) return undefined;
    let active = true; const session = captureChatSession(user);
    staffAPI.list().then(({ data }) => { if (active && session.current()) setStaff(data); }).catch(() => { if (active && session.current()) setError('Chưa tải được nhân viên để chuyển tư vấn.'); });
    return () => { active = false; };
  }, [user._id, user.isAdmin, token]);
  const changeView = value => { setView(value); setPage(1); setSelected(null); };
  const onChanged = chat => { if (chat) { setSelected(chat); if (!user.isAdmin && ownsChat(user, chat) && chat.state === 'open') { setView('mine'); setPage(1); } } setRefresh(value => value + 1); };
  return <div className="consult-inbox">
    <div className="consult-inbox__heading"><div><h2>Tư vấn khách hàng</h2><p>Trao đổi về mẫu giày, màu sắc, size và nhu cầu mua sắm của khách.</p></div><button type="button" onClick={() => setRefresh(value => value + 1)}>Tải lại hộp thư</button></div>
    <nav className="consult-inbox__filters" aria-label="Lọc tư vấn">{[...(user.isAdmin ? [['all', 'Tất cả']] : []), ['waiting', 'Chờ tiếp nhận'], ['mine', 'Tôi phụ trách'], ['closed', 'Đã kết thúc']].map(([value, label]) => <button type="button" key={value} aria-current={view === value ? 'page' : undefined} onClick={() => changeView(value)}>{label}</button>)}</nav>
    {error && <p className="consult-error" role="alert">{error}</p>}
    <div className="consult-inbox__layout"><aside className="consult-inbox__list" aria-label="Danh sách cuộc trò chuyện">
      {loading && !result.items.length && <p role="status">Đang tải hộp thư...</p>}
      {!loading && !result.items.length && <p className="consult-empty">Chưa có cuộc trò chuyện trong mục này.</p>}
      {result.items.map(chat => <button type="button" key={chat._id} className={selected?._id === chat._id ? 'is-selected' : ''} onClick={() => setSelected(chat)}><strong>{chat.customerName}{chat.unread && <i aria-label="Chưa đọc" />}</strong><span>{chat.lastMessage}</span><small>{chat.state === 'closed' ? 'Đã kết thúc' : chat.advisorName || 'Chờ tiếp nhận'} · {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}</small></button>)}
      <div className="consult-inbox__pages"><button type="button" disabled={page <= 1} onClick={() => { setSelected(null); setPage(value => value - 1); }}>←</button><span>{page}/{result.pages} · {result.total} cuộc</span><button type="button" disabled={page >= result.pages} onClick={() => { setSelected(null); setPage(value => value + 1); }}>→</button></div>
    </aside>{selected ? <AdvisorThread key={`${selected._id}:${selected.assignedTo?.accountType || ''}:${selected.assignedTo?.id || ''}`} selected={selected} staff={staff} onChanged={onChanged} /> : <div className="consult-inbox__placeholder"><strong>Chọn một cuộc trò chuyện</strong><p>Tiếp nhận khách đang chờ hoặc mở cuộc tư vấn bạn phụ trách để trả lời.</p></div>}</div>
  </div>;
}
