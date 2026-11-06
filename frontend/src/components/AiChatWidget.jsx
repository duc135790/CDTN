// frontend/src/components/AiChatWidget.jsx
// Giả định: utils/api.js export default một axios instance có baseURL '/api'.
// Chỉnh PRODUCT_PATH cho đúng route chi tiết sản phẩm của bạn.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const PRODUCT_PATH = (id) => `/products/${id}`;
const ID_PATTERN = /\[\[([a-f0-9]{24})\]\]/gi;

const SUGGESTIONS = [
  'Giày đi học dưới 1 triệu',
  'Giày chạy bộ cho người mới',
  'Mình đi size 40, có mẫu nào?',
];

const styles = {
  button: {
    position: 'fixed', left: 20, bottom: 20, zIndex: 1000, width: 56, height: 56,
    borderRadius: '50%', border: 'none', background: '#111', color: '#fff',
    fontSize: 24, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.25)',
  },
  panel: {
    position: 'fixed', left: 20, bottom: 88, zIndex: 1000, width: 'min(360px, calc(100vw - 40px))',
    height: 'min(520px, calc(100vh - 120px))', background: '#fff', color: '#111',
    borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.25)', display: 'flex',
    flexDirection: 'column', overflow: 'hidden', fontFamily: 'inherit',
  },
  header: { padding: '12px 16px', background: '#111', color: '#fff', fontWeight: 600 },
  body: { flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  bubble: (isUser) => ({
    alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '8px 12px',
    borderRadius: 12, background: isUser ? '#111' : '#f1f1f1', color: isUser ? '#fff' : '#111',
    whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.4,
  }),
  chip: { border: '1px solid #ddd', background: '#fff', borderRadius: 16, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  form: { display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #eee' },
  input: { flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 },
  send: { padding: '8px 14px', border: 'none', borderRadius: 8, background: '#111', color: '#fff', cursor: 'pointer' },
};

// Biến [[id]] thành link "Xem sản phẩm"
function renderMessage(text) {
  const parts = [];
  let last = 0;
  let match;
  ID_PATTERN.lastIndex = 0;
  while ((match = ID_PATTERN.exec(text)) !== null) {
    parts.push(text.slice(last, match.index));
    parts.push(
      <Link key={match.index} to={PRODUCT_PATH(match[1])} style={{ color: '#2563eb' }}>
        [Xem sản phẩm]
      </Link>
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Chào bạn! Mình có thể giúp bạn chọn giày. Bạn cần giày để làm gì và ngân sách khoảng bao nhiêu?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading, open]);

  const send = async (raw) => {
    const text = raw.trim();
    if (!text || loading) return;

    // Bỏ câu chào đầu tiên khỏi history gửi lên server
    const history = messages.slice(1).map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai-chat', { message: text, history });
      setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không kết nối được chatbot, vui lòng thử lại.';
      setMessages((prev) => [...prev, { role: 'model', text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button style={styles.button} onClick={() => setOpen((o) => !o)} aria-label="Mở chatbot tư vấn">
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div style={styles.panel} role="dialog" aria-label="Tư vấn chọn giày">
          <div style={styles.header}>Tư vấn chọn giày</div>

          <div style={styles.body} ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} style={styles.bubble(m.role === 'user')}>
                {m.role === 'model' ? renderMessage(m.text) : m.text}
              </div>
            ))}
            {loading && <div style={styles.bubble(false)}>Đang trả lời...</div>}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} style={styles.chip} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <form
            style={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              maxLength={500}
            />
            <button style={styles.send} type="submit" disabled={loading}>Gửi</button>
          </form>
        </div>
      )}
    </>
  );
}