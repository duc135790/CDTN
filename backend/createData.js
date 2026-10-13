// backend/createData.js - TẠO DỮ LIỆU MẪU CHO WEB BÁN GIÀY
// ⚠️ Script này XÓA sạch customers, products, orders rồi tạo lại.
//    Chỉ chạy trên database dùng để học/test.
// Chạy:  node backend/createData.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Kết nối MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Ảnh tạm (placeholder). Thay bằng ảnh thật qua trang Admin hoặc sửa link ở đây.
const img = (text) =>
  `https://placehold.co/600x600/png?text=${encodeURIComponent(text)}`;

// ẢNH SẢN PHẨM CHO DỮ LIỆU MẪU
// Cách thêm: copy file ảnh vào  frontend/public/images/  rồi ghi tên file vào bảng dưới
// (đường dẫn bắt đầu bằng /images/). Sản phẩm nào chưa có trong bảng sẽ dùng ảnh tạm.
// Ví dụ (bỏ dấu // ở đầu dòng khi đã có file ảnh):
const IMAGES = {
  // 'Nike Air Force 1 Low': '/images/nike-air-force-1-low.jpg',
  // 'Adidas Samba OG': '/images/adidas-samba-og.jpg',
  // 'Converse Chuck Taylor All Star': '/images/converse-chuck-taylor.jpg',
  // 'Adidas Ultraboost Light': '/images/adidas-ultraboost-light.jpg',
  // 'Nike Pegasus 41': '/images/nike-pegasus-41.jpg',
  // 'Giày Da Oxford Công Sở': '/images/giay-da-oxford.jpg',
  // 'Giày Lười Loafer Da Bò': '/images/giay-loafer.jpg',
  // 'Sandal Quai Ngang Êm Chân': '/images/sandal-quai-ngang.jpg',
  // 'Puma Suede Classic': '/images/puma-suede-classic.jpg',
  // 'Nike Mercurial Vapor Sân Cỏ Nhân Tạo': '/images/nike-mercurial-vapor.jpg',
};

const now = () => new Date();

// Helper để mỗi sản phẩm gọn hơn
const shoe = ({ name, brand, category, price, color, sizes, countInStock, description }) => ({
  name,
  brand,
  category,
  price,
  color,
  sizes,
  countInStock,
  description,
  image: IMAGES[name] || img(name),
  reviews: [],
  rating: 0,
  numReviews: 0,
  isHidden: false,
  createdAt: now(),
  updatedAt: now(),
});

const createData = async () => {
  try {
    await connectDB();

    // 1. CUSTOMERS
    console.log('\n📝 Đang tạo customers...');
    const customersCollection = mongoose.connection.collection('customers');
    await customersCollection.deleteMany({});

    const customers = [
      {
        email: 'admin@shoeshop.com',
        name: 'Admin',
        phone: '0901234567',
        password: await hashPassword('admin123'),
        isAdmin: true,
        cart: [],
        createdAt: now(),
        updatedAt: now(),
      },
      {
        email: 'user1@example.com',
        name: 'Khách Hàng 1',
        phone: '0907654321',
        password: await hashPassword('user123'),
        isAdmin: false,
        cart: [],
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    await customersCollection.insertMany(customers);
    console.log(`✅ Đã tạo ${customers.length} customers`);

    // 2. PRODUCTS (giày)
    console.log('\n👟 Đang tạo products...');
    const productsCollection = mongoose.connection.collection('products');
    await productsCollection.deleteMany({});

    const products = [
      // SNEAKER
      shoe({
        name: 'Nike Air Force 1 Low',
        brand: 'Nike',
        category: 'Sneaker',
        price: 2929000,
        color: 'Trắng',
        sizes: [38, 39, 40, 41, 42, 43],
        countInStock: 40,
        description: 'Mẫu sneaker cổ thấp kinh điển, đế êm, dễ phối đồ hằng ngày.',
      }),
      shoe({
        name: 'Adidas Samba OG',
        brand: 'Adidas',
        category: 'Sneaker',
        price: 2500000,
        color: 'Đen/Trắng',
        sizes: [37, 38, 39, 40, 41, 42],
        countInStock: 35,
        description: 'Thiết kế retro lấy cảm hứng từ giày bóng đá trong nhà, phù hợp đi chơi và đi học.',
      }),
      shoe({
        name: 'Converse Chuck Taylor All Star',
        brand: 'Converse',
        category: 'Sneaker',
        price: 1450000,
        color: 'Đen',
        sizes: [36, 37, 38, 39, 40, 41, 42],
        countInStock: 60,
        description: 'Giày vải cổ điển, nhẹ, giá dễ tiếp cận cho học sinh sinh viên.',
      }),

      // GIÀY CHẠY BỘ
      shoe({
        name: 'Adidas Ultraboost Light',
        brand: 'Adidas',
        category: 'Giày chạy bộ',
        price: 4500000,
        color: 'Xám',
        sizes: [39, 40, 41, 42, 43, 44],
        countInStock: 25,
        description: 'Giày chạy bộ đệm êm, phù hợp chạy đường dài và tập luyện hằng ngày.',
      }),
      shoe({
        name: 'Nike Pegasus 41',
        brand: 'Nike',
        category: 'Giày chạy bộ',
        price: 3829000,
        color: 'Xanh dương',
        sizes: [38, 39, 40, 41, 42, 43],
        countInStock: 30,
        description: 'Dòng giày chạy bộ đa dụng, êm và bền, dùng được cho cả người mới bắt đầu.',
      }),

      // GIÀY DA
      shoe({
        name: 'Giày Da Oxford Công Sở',
        brand: 'Vascara',
        category: 'Giày da',
        price: 1290000,
        color: 'Nâu',
        sizes: [39, 40, 41, 42, 43],
        countInStock: 20,
        description: 'Giày da thật mũi tròn, lịch sự, phù hợp đi làm và dự sự kiện.',
      }),
      shoe({
        name: 'Giày Lười Loafer Da Bò',
        brand: 'Bitis',
        category: 'Giày da',
        price: 990000,
        color: 'Đen',
        sizes: [38, 39, 40, 41, 42],
        countInStock: 28,
        description: 'Giày lười da bò mềm, xỏ nhanh tiện lợi, dùng cho đi làm hoặc đi chơi.',
      }),

      // SANDAL
      shoe({
        name: 'Sandal Quai Ngang Êm Chân',
        brand: 'Bitis',
        category: 'Sandal',
        price: 350000,
        color: 'Xanh rêu',
        sizes: [36, 37, 38, 39, 40, 41, 42],
        countInStock: 70,
        description: 'Sandal quai ngang đế êm, nhẹ, chống trơn, hợp mang đi biển và dạo phố.',
      }),

      // GIÀY THỂ THAO
      shoe({
        name: 'Puma Suede Classic',
        brand: 'Puma',
        category: 'Giày thể thao',
        price: 2400000,
        color: 'Đỏ',
        sizes: [38, 39, 40, 41, 42, 43],
        countInStock: 22,
        description: 'Giày thể thao da lộn phong cách streetwear, bám tốt và bền.',
      }),
      shoe({
        name: 'Nike Mercurial Vapor Sân Cỏ Nhân Tạo',
        brand: 'Nike',
        category: 'Giày thể thao',
        price: 1850000,
        color: 'Cam',
        sizes: [39, 40, 41, 42, 43, 44],
        countInStock: 18,
        description: 'Giày đá bóng sân cỏ nhân tạo, nhẹ, ôm chân, tăng tốc độ khi di chuyển.',
      }),
    ];
    await productsCollection.insertMany(products);
    console.log(`✅ Đã tạo ${products.length} products`);

    // 3. ORDERS (rỗng)
    console.log('\n📦 Đang tạo collection orders...');
    const ordersCollection = mongoose.connection.collection('orders');
    await ordersCollection.deleteMany({});
    console.log('✅ Collection orders đã sẵn sàng');

    // 4. THÔNG TIN
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TẠO DỮ LIỆU THÀNH CÔNG!');
    console.log('='.repeat(60));
    console.log('\n📊 Thống kê:');
    console.log(`   - Customers: ${await customersCollection.countDocuments()} tài khoản`);
    console.log(`   - Products: ${await productsCollection.countDocuments()} đôi giày`);
    console.log(`   - Orders: ${await ordersCollection.countDocuments()} đơn hàng`);

    console.log('\n🔐 Tài khoản đăng nhập (chỉ dùng để học, hãy đổi khi đưa lên mạng):');
    console.log('   📌 ADMIN  - admin@shoeshop.com / admin123');
    console.log('   📌 USER   - user1@example.com / user123');

    console.log('\n💡 Bước tiếp theo: chạy "npm run dev" rồi mở http://localhost:5173\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    console.error(error);
    process.exit(1);
  }
};

createData();