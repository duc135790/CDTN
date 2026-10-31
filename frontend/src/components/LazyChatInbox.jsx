import { lazy, Suspense } from 'react';

const ChatInbox = lazy(() => import('./ChatInbox'));
export default function LazyChatInbox() {
  return <Suspense fallback={<p role="status" className="p-4">Đang mở hộp thư tư vấn...</p>}><ChatInbox /></Suspense>;
}
