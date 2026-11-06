// backend/controllers/aiChatController.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import Product from '../models/productModel.js';

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;
const CATALOG_TTL_MS = 60 * 1000;
const CATALOG_LIMIT = 60;

let catalogCache = { text: '', expiresAt: 0 };
const formatVND = (n) => `${Math.round(Number(n || 0)).toLocaleString('vi-VN')}đ`;

function summarizeVariants(variants = []) {
  const byColor = new Map();
  for (const v of variants) {
    if (!v || Number(v.quantity) <= 0) continue;
    if (!byColor.has(v.color)) byColor.set(v.color, []);
    byColor.get(v.color).push(v.size);
  }
  return [...byColor.entries()]
    .map(([color, sizes]) => `${color}: size ${sizes.sort((a, b) => a - b).join(', ')}`)
    .join(' | ');
}

async function getCatalogText() {
  if (catalogCache.text && catalogCache.expiresAt > Date.now()) return catalogCache.text;

  const products = await Product.find({ isArchived: { $ne: true }, isHidden: { $ne: true } })
    .select('name brand category gender style material price discountPercent description variants countInStock')
    .limit(CATALOG_LIMIT)
    .lean();

  const text = products
    .map((p) => {
      const finalPrice = p.price * (1 - (p.discountPercent || 0) / 100);
      const stock = summarizeVariants(p.variants);
      const inStock = p.variants?.length ? Boolean(stock) : p.countInStock > 0;
      return [
        `[[${p._id}]] ${p.name}`,
        `thương hiệu: ${p.brand}`,
        `danh mục: ${p.category}`,
        p.gender ? `dành cho: ${p.gender}` : null,
        p.style ? `kiểu: ${p.style}` : null,
        p.material ? `chất liệu: ${p.material}` : null,
        `giá: ${formatVND(finalPrice)}${p.discountPercent ? ` (đã giảm ${p.discountPercent}%)` : ''}`,
        inStock ? (stock ? `còn hàng: ${stock}` : 'còn hàng') : 'HẾT HÀNG',
        p.description ? `mô tả: ${String(p.description).slice(0, 200)}` : null,
      ]
        .filter(Boolean)
        .join('; ');
    })
    .join('\n');

  catalogCache = { text, expiresAt: Date.now() + CATALOG_TTL_MS };
  return text;
}

function buildSystemInstruction(catalogText) {
  return `Bạn là trợ lý tư vấn của cửa hàng giày SHOE STORE. Nhiệm vụ: giúp khách chọn giày phù hợp.

Quy tắc:
- Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa khoảng 120 từ).
- CHỈ gợi ý sản phẩm có trong DANH SÁCH SẢN PHẨM bên dưới. Không bịa sản phẩm, giá, size hay khuyến mãi.
- Hỏi thêm khi thiếu thông tin: mục đích dùng (đi học, chạy bộ, đi chơi, công sở), ngân sách, size, màu yêu thích.
- Khi gợi ý một sản phẩm, ghi đúng mã dạng [[id]] ngay sau tên sản phẩm để website tạo liên kết. Không đổi hay bịa mã.
- Chỉ nói còn size/màu nào dựa trên dữ liệu "còn hàng". Không gợi ý sản phẩm HẾT HÀNG. Nếu không có sản phẩm phù hợp, nói thẳng.
- Không xử lý đơn hàng, thanh toán, hoàn tiền. Với các việc đó, hướng dẫn khách liên hệ cửa hàng hoặc xem mục Đơn hàng.

DANH SÁCH SẢN PHẨM:
${catalogText || '(Hiện chưa có sản phẩm nào đang bán)'}`;
}

export const aiChat = async (req, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'Chatbot chưa được cấu hình API Key.' });
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ message: `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.` });
    }

    const catalogText = await getCatalogText();
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Thay vì dùng process.env, bạn gán cứng tên model mới nhất vào đây luôn để nó không bị lệch nữa
   const modelName = 'gemini-3.8-flash';
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: buildSystemInstruction(catalogText),
    });

    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = rawHistory
      .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text.slice(0, MAX_MESSAGE_LENGTH) }],
      }));

    while (history.length && history[0].role !== 'user') history.shift();

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const reply = response.text().trim();

    if (!reply) {
      return res.status(502).json({ message: 'Chatbot không có câu trả lời, hãy thử diễn đạt lại.' });
    }

    return res.json({ reply });
  } catch (error) {
    console.error('Gemini SDK Error:', error);
    return res.status(502).json({ message: `Chatbot gặp lỗi: ${error.message || 'Lỗi hệ thống'}` });
  }
};