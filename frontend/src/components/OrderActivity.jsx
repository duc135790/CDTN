export default function OrderActivity({ items = [] }) {
  if (!items.length) return null;
  return <details className="mt-4 rounded-lg border border-gray-200 p-3 text-sm">
    <summary className="cursor-pointer font-semibold">Lịch sử xử lý ({items.length})</summary>
    <ol className="mt-3 space-y-3">{[...items].reverse().map((item, index) => <li key={index} className="border-l-2 border-red-200 pl-3">
      <p><strong>{item.actorName}</strong> · {new Date(item.at).toLocaleString('vi-VN')}</p>
      <p>{item.action === 'assignment' ? (item.to ? 'Phân công nhân viên xử lý đơn' : 'Gỡ phân công nhân viên') : `${item.from} → ${item.to}`}</p>
      {item.note && <p className="text-gray-600">{item.note}</p>}
    </li>)}</ol>
  </details>;
}
