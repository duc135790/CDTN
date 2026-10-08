// backend/checkDb.js - KIỂM TRA KẾT NỐI MONGODB (không in mật khẩu ra màn hình)
// Chạy:  node backend/checkDb.js

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

console.log('--- 1. File .env ---');
if (!fs.existsSync(envPath)) {
  console.log('❌ Không thấy file:', envPath);
  process.exit(1);
}
const raw = fs.readFileSync(envPath);
const hasBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
const isUtf16 = (raw[0] === 0xff && raw[1] === 0xfe) || (raw[0] === 0xfe && raw[1] === 0xff);
console.log('Kích thước:', raw.length, 'byte');
console.log('Mã hóa UTF-16 (sai):', isUtf16 ? 'CÓ' : 'không');
console.log('Có BOM:', hasBom ? 'có' : 'không');

const fromFile = dotenv.parse(raw);
console.log('Các biến đọc được từ file:', Object.keys(fromFile).join(', ') || '(không có)');

console.log('\n--- 2. Biến hệ thống có ghi đè không? ---');
const sysUri = process.env.MONGO_URI;
if (sysUri && sysUri !== fromFile.MONGO_URI) {
  console.log('⚠️  PowerShell/Windows đang có biến MONGO_URI RIÊNG, khác với file .env -> nó sẽ thắng file .env');
  console.log('    Gỡ bằng lệnh:  Remove-Item Env:MONGO_URI');
} else {
  console.log('OK, không bị ghi đè');
}

const uri = fromFile.MONGO_URI;
console.log('\n--- 3. Phân tích MONGO_URI (ẩn mật khẩu) ---');
if (!uri) {
  console.log('❌ Không có MONGO_URI trong file .env');
  process.exit(1);
}
try {
  const u = new URL(uri);
  const pass = decodeURIComponent(u.password);
  console.log('Giao thức :', u.protocol);
  console.log('Username  :', JSON.stringify(decodeURIComponent(u.username)));
  console.log('Độ dài mật khẩu:', pass.length, 'ký tự');
  console.log('Mật khẩu có khoảng trắng đầu/cuối:', pass !== pass.trim() ? 'CÓ (sai)' : 'không');
  console.log('Mật khẩu chỉ gồm chữ và số:', /^[A-Za-z0-9]+$/.test(pass) ? 'đúng' : 'KHÔNG (ký tự đặc biệt cần mã hóa URL)');
  console.log('Host      :', u.hostname);
  console.log('Database  :', u.pathname.replace('/', '') || '(trống -> sẽ dùng "test")');
  console.log('Có dấu < > trong chuỗi:', /[<>]/.test(uri) ? 'CÓ (sai, bỏ dấu < >)' : 'không');
} catch (e) {
  console.log('❌ Chuỗi MONGO_URI sai định dạng:', e.message);
  process.exit(1);
}

console.log('\n--- 4. Thử kết nối ---');
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ KẾT NỐI THÀNH CÔNG, database:', mongoose.connection.name);
  await mongoose.disconnect();
} catch (e) {
  console.log('❌ Thất bại:', e.message);
  if (/bad auth|authentication failed/i.test(e.message)) {
    console.log('   -> Sai username hoặc mật khẩu so với user trong Atlas > Database Users.');
  } else if (/ENOTFOUND|querySrv/i.test(e.message)) {
    console.log('   -> Sai host trong chuỗi hoặc mạng đang chặn.');
  } else if (/timed out|Server selection/i.test(e.message)) {
    console.log('   -> Thường do IP chưa được thêm vào Atlas > IP Access List, hoặc cluster đang tạm dừng.');
  }
}
process.exit(0);