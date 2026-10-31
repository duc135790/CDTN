import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../utils/api';
import { captureChatSession, chatDraft, mergeChatMessages } from '../utils/chat';

export default function useChatThread({ conversationId, customer = false, enabled = true }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const generation = useRef(0), activeId = useRef(null), latest = useRef(0), oldest = useRef(0);
  const sendLock = useRef(null), olderLock = useRef(null), retry = useRef(null);
  const mounted = useRef(false), reload = useRef(null);
  const readVisible = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);

  useEffect(() => {
    generation.current += 1; activeId.current = conversationId || null; latest.current = 0; oldest.current = 0;
    retry.current = null; sendLock.current = null; olderLock.current = null; setLoadingOlder(false);
    setConversation(null); setMessages([]); setHasOlder(false); setSending(false); setLoadError(''); setSendError(''); setUnavailable(false);
  }, [conversationId, customer, user?._id, user?.accountType, token]);

  useEffect(() => {
    if (!enabled || !user || !customer && !conversationId) { setLoading(false); return () => { generation.current += 1; }; }
    const session = captureChatSession(user), controller = new AbortController();
    let active = true, polling = false;
    const options = { token: session.token, signal: controller.signal };
    const current = version => active && session.current() && version === generation.current;
    const load = async () => {
      if (polling || sendLock.current || document.visibilityState === 'hidden' || !session.current()) return;
      polling = true; const version = generation.current;
      try {
        let id = activeId.current;
        if (customer) {
          const { data } = await chatAPI.mine(options);
          if (!current(version)) return;
          setConversation(data); id = data?._id; activeId.current = id || null;
        }
        if (!id) { setLoadError(''); setUnavailable(false); return; }
        const after = latest.current;
        const { data } = await chatAPI.messages(id, after ? { after } : {}, options);
        if (!current(version)) return;
        setConversation(data.conversation); setUnavailable(false); setLoadError('');
        if (!after) setHasOlder(data.hasMore);
        const rows = data.messages;
        if (rows.length) {
          latest.current = Math.max(latest.current, rows.at(-1).seq);
          oldest.current = oldest.current ? Math.min(oldest.current, rows[0].seq) : rows[0].seq;
          setMessages(previous => mergeChatMessages(previous, rows));
        }
        const displayedSeq = latest.current;
        if (displayedSeq > data.conversation.readSeq && readVisible.current && document.visibilityState !== 'hidden') {
          const read = await chatAPI.read(id, displayedSeq, options);
          if (current(version)) setConversation(previous => previous ? { ...previous, readSeq: Math.max(previous.readSeq, read.data.readSeq), unread: previous.lastSeq <= displayedSeq ? false : previous.unread } : previous);
        }
      } catch (error) {
        if (!current(version)) return;
        if ([403, 404].includes(error.response?.status)) { setUnavailable(true); setMessages([]); }
        setLoadError(error.response?.data?.message || 'Chưa tải được tin nhắn. Vui lòng thử lại.');
      } finally { polling = false; if (current(version)) setLoading(false); }
    };
    reload.current = load; setLoading(true); load();
    const timer = setInterval(load, 3000);
    const visible = () => { if (document.visibilityState !== 'hidden') load(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; generation.current += 1; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); reload.current = null; };
  }, [enabled, conversationId, customer, user?._id, user?.accountType, token]);

  const send = async (text, productId) => {
    if (sendLock.current || !enabled || !text.trim() || text.trim().length > 2000 || unavailable) return false;
    const session = captureChatSession(user);
    if (!session.current()) return false;
    const operation = {}; sendLock.current = operation; const version = ++generation.current; setSending(true); setSendError('');
    const payload = chatDraft(text, productId, retry.current); retry.current = payload;
    const current = () => mounted.current && generation.current === version && session.current();
    try {
      const { data } = await chatAPI.send(customer ? null : activeId.current, payload, { token: session.token });
      if (!current()) return false;
      activeId.current = data.conversation._id;
      // A reply may arrive between the last poll and this send. Advancing past
      // that gap would permanently skip the unseen reply on subsequent polls.
      if (data.message.seq === latest.current + 1) latest.current = data.message.seq;
      if (!oldest.current) oldest.current = data.message.seq;
      setConversation(data.conversation); setMessages(previous => mergeChatMessages(previous, [data.message]));
      retry.current = null; return true;
    } catch (error) {
      if (current()) {
        if (error.response?.status === 403 || error.response?.status === 404 && !productId) { setUnavailable(true); setMessages([]); }
        setSendError(error.response?.data?.message || 'Chưa xác nhận được tin nhắn đã gửi. Bạn có thể bấm gửi lại; hệ thống sẽ tránh gửi trùng.');
      }
      return false;
    } finally {
      if (sendLock.current === operation) {
        sendLock.current = null;
        if (mounted.current && session.current()) { setSending(false); setLoading(false); }
      }
    }
  };
  const loadOlder = async () => {
    if (olderLock.current || !activeId.current || !oldest.current || !hasOlder || !enabled) return;
    const session = captureChatSession(user), version = generation.current;
    if (!session.current()) return;
    const operation = {}; olderLock.current = operation; setLoadingOlder(true);
    const current = () => mounted.current && generation.current === version && session.current();
    try {
      const { data } = await chatAPI.messages(activeId.current, { before: oldest.current }, { token: session.token });
      if (!current()) return;
      if (data.messages.length) oldest.current = Math.min(oldest.current, data.messages[0].seq);
      setMessages(previous => mergeChatMessages(previous, data.messages)); setHasOlder(data.hasMore);
    } catch (error) { if (current()) setLoadError(error.response?.data?.message || 'Chưa tải được tin nhắn cũ.'); }
    finally { if (olderLock.current === operation) { olderLock.current = null; if (mounted.current && session.current()) setLoadingOlder(false); } }
  };
  return { conversation, messages, loading, sending, loadingOlder, hasOlder, loadError, sendError, unavailable, send, loadOlder,
    setReadVisible: value => { readVisible.current = value === true; }, reload: () => reload.current?.() };
}
