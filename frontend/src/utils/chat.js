export const isChatCustomer = user => Boolean(user && !user.isAdmin && user.accountType !== 'staff');
export const ownsChat = (user, chat) => Boolean(user && chat?.assignedTo && String(chat.assignedTo.id) === String(user._id)
  && chat.assignedTo.accountType === (user.accountType || 'customer'));
export const canReplyChat = (user, chat) => Boolean(chat?.state === 'open' && ownsChat(user, chat));
export const mergeChatMessages = (old, incoming) => [...new Map([...old, ...incoming].map(item => [item.seq, item])).values()].sort((a, b) => a.seq - b.seq);
export const captureChatSession = user => {
  const token = localStorage.getItem('token');
  const owner = `${user?.accountType || 'customer'}:${user?._id || ''}`;
  const current = () => {
    try {
      const profile = JSON.parse(localStorage.getItem('user') || 'null');
      return Boolean(user && token && token === localStorage.getItem('token') && owner === `${profile?.accountType || 'customer'}:${profile?._id || ''}`);
    } catch { return false; }
  };
  return { token, current };
};
export const chatDraft = (text, productId, previous) => {
  const content = text.trim();
  if (previous?.text === content && previous.productId === productId) return previous;
  return { text: content, clientId: window.crypto.randomUUID(), ...(productId ? { productId } : {}) };
};
