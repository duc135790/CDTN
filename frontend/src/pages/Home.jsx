import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaShoePrints, FaFire, FaChevronLeft, FaChevronRight, FaShoppingCart 
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { cartAPI } from '../utils/api';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});

  const slides = [
    {
      title: '🔥 GIẢM GIÁ ĐẾN 50%',
      subtitle: 'Bộ sưu tập Sneaker mới - Thoải mái từng bước chân',
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      image: 'https://placehold.co/800x640/png?text=Sneaker',
      link: '/products?category=Sneaker'
    },
    {
      title: '⚡ GIÀY CHẠY BỘ',
      subtitle: 'Êm chân, nhẹ nhàng - Chinh phục mọi cung đường',
      bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      image: 'https://placehold.co/800x640/png?text=Chay+Bo',
      link: '/products?category=Giày chạy bộ'
    },
    {
      title: '👞 GIÀY DA CÔNG SỞ',
      subtitle: 'Lịch sự, bền đẹp - Tự tin mỗi ngày đi làm',
      bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      image: 'https://placehold.co/800x640/png?text=Giay+Da',
      link: '/products?category=Giày da'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // ✅ CRITICAL FIX: Reload khi quay lại trang
  useEffect(() => {
    console.log('🏠 Home page mounted/updated');
    fetchProducts();
  }, [location.key]); // ✅ Thêm location.key để reload khi navigate back

  // ✅ CRITICAL FIX: Thêm visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Page became visible, reloading products...');
        fetchProducts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ✅ CRITICAL FIX: Thêm focus listener
  useEffect(() => {
    const handleFocus = () => {
      console.log('🎯 Window focused, reloading products...');
      fetchProducts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Fetching products with timestamp:', Date.now());
      
      // ✅ CRITICAL: Force reload với timestamp
      const { data } = await axios.get(`http://localhost:5000/api/products?_t=${Date.now()}`);
      
      console.log('✅ Products loaded:', data.length);
      setFeaturedProducts(data.slice(0, 4));
      setNewProducts(data.slice(0, 8));
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    setAddingToCart(prev => ({ ...prev, [productId]: true }));

    try {
      console.log('🛒 Adding to cart:', productId);
      await cartAPI.addToCart(productId, 1);
      
      // ✅ CRITICAL: Reload ngay lập tức
      console.log('🔄 Reloading products after add to cart...');
      await fetchProducts();
      
      alert('✅ Đã thêm vào giỏ hàng!');
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      alert('❌ Thêm vào giỏ hàng thất bại: ' + (error.response?.data?.message || error.message));
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  const ProductCard = ({ product }) => {
    const isOutOfStock = !product.countInStock || product.countInStock === 0;
    
    return (
      <Link to={`/products/${product._id}`} className="bg-white rounded-lg border border-gray-200 p-3 transition-all hover:shadow-md flex flex-col h-full group cursor-pointer">
        <div className="relative mb-3 aspect-square overflow-hidden rounded-md">
          <img 
            src={product.image} 
            alt={product.name} 
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
            onError={(e) => e.target.src = 'https://via.placeholder.com/300x400?text=Shoe'}
          />
          {isOutOfStock ? (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                HẾT HÀNG
              </span>
            </div>
          ) : (
            <div className="absolute top-2 left-2 bg-[#27ae60] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
              Mới
            </div>
          )}
        </div>
        <div className="flex flex-col flex-grow">
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 h-10 mb-1 leading-tight group-hover:text-red-600">
            {product.name}
          </h3>
          
          <div className="mt-2">
            <div className="text-[#d72e2e] font-bold text-lg mb-0.5">
              {product.price?.toLocaleString()}đ
            </div>
            <div className={`text-[11px] mb-3 ${isOutOfStock ? 'text-red-600 font-bold' : product.countInStock < 10 ? 'text-orange-600' : 'text-green-600'}`}>
              {isOutOfStock ? 'Hết hàng' : `Còn: ${product.countInStock} sản phẩm`}
              {!isOutOfStock && product.countInStock < 10 && ' '}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isOutOfStock) {
                  handleAddToCart(product._id, e);
                }
              }}
              disabled={addingToCart[product._id] || isOutOfStock}
              className={`flex-1 py-2 rounded-md font-bold text-xs transition-colors uppercase flex items-center justify-center gap-1 ${
                isOutOfStock 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#d72e2e] text-white hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isOutOfStock ? (
                <span>Hết hàng</span>
              ) : addingToCart[product._id] ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Thêm...</span>
                </>
              ) : (
                <>
                  <FaShoppingCart size={12} />
                  <span>Giỏ hàng</span>
                </>
              )}
            </button>
            <button className="px-3 bg-gray-100 text-gray-700 rounded-md font-bold text-xs hover:bg-gray-200 transition-colors">
              Chi tiết
            </button>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans flex flex-col">
      
      {/* NAVIGATION */}
      <nav className="bg-white border-t border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center space-x-10 py-3">
            {[
              { name: "Trang chủ", path: "/" },
              { name: "Sneaker", path: "/products?category=Sneaker" },
              { name: "Giày chạy bộ", path: "/products?category=Giày chạy bộ" },
              { name: "Giày da", path: "/products?category=Giày da" },
              { name: "Sandal", path: "/products?category=Sandal" },
              { name: "Giày thể thao", path: "/products?category=Giày thể thao" },
            ].map((item, index) => (
              <Link
                key={index}
                to={item.path}
                className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors uppercase tracking-wide"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* BANNER */}
      <section className="relative h-[420px] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 flex items-center ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{ background: slide.bg }}
          >
            <div className="container mx-auto px-4 flex items-center justify-between h-full">
              <div className="max-w-md animate-slideUp">
                <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                  <span className="text-yellow-300 mr-2">⚡</span>{slide.title}
                </h2>
                <p className="text-lg text-white/90 mb-8">{slide.subtitle}</p>
                <Link to={slide.link} className="bg-white text-gray-800 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-all inline-block">
                  Khám phá ngay
                </Link>
              </div>
              <div className="hidden lg:block animate-float">
                <img 
                  src={slide.image} 
                  className="w-[380px] h-[320px] object-cover rounded-2xl shadow-2xl border-4 border-white/20"
                  alt="Banner giày"
                />
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 p-2 rounded-full text-white hover:bg-white/40"><FaChevronLeft size={20}/></button>
        <button onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 p-2 rounded-full text-white hover:bg-white/40"><FaChevronRight size={20}/></button>
      </section>

      {/* MAIN CONTENT */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center pt-4 pb-8">
          <h1 className="text-3xl font-black text-gray-800 mb-1 uppercase tracking-tight">Giày Chính Hãng</h1>
          <p className="text-sm text-gray-400 font-semibold tracking-wide">Tìm thấy {featuredProducts.length + newProducts.length} sản phẩm</p>
        </div>

        {/* GIÀY NỔI BẬT */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b-2 border-red-500 pb-2">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-wide">
              <FaFire className="text-red-500" /> GIÀY NỔI BẬT
            </h2>
            <Link to="/products" className="text-blue-500 text-xs font-bold hover:underline">XEM TẤT CẢ →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {loading ? <SkeletonGrid count={4} /> : featuredProducts.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>

        {/* GIÀY MỚI NHẤT */}
        <section>
          <div className="flex items-center justify-between mb-6 border-b-2 border-blue-500 pb-2">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-wide">
              <FaShoePrints className="text-blue-500" /> GIÀY MỚI NHẤT
            </h2>
            <Link to="/products" className="text-blue-500 text-xs font-bold hover:underline">XEM TẤT CẢ →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {loading ? <SkeletonGrid count={8} /> : newProducts.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0f172a] text-white pt-16 pb-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16 text-sm">
            <div>
              <h4 className="font-bold text-lg mb-6">Về Chúng Tôi</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">Giới thiệu</Link></li>
                <li><Link to="/news" className="hover:text-white transition-colors">Tin tức</Link></li>
                <li><Link to="/careers" className="hover:text-white transition-colors">Tuyển dụng</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">Chính Sách</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/return" className="hover:text-white transition-colors">Chính sách đổi trả</Link></li>
                <li><Link to="/shipping" className="hover:text-white transition-colors">Chính sách vận chuyển</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">Hỗ Trợ</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/guide" className="hover:text-white transition-colors">Hướng dẫn mua hàng</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">Câu hỏi thường gặp</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">Kết Nối</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="#" className="hover:text-white transition-colors">Facebook</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Instagram</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
            <p>© 2024 ShoeStore.vn - Giày chính hãng</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-slideUp { animation: slideUp 0.6s ease-out forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

const SkeletonGrid = ({ count }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full col-span-full">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white p-4 rounded-lg animate-pulse border border-gray-100">
        <div className="bg-gray-100 aspect-[3/4] rounded-md mb-4" />
        <div className="bg-gray-100 h-4 w-3/4 mb-2" />
        <div className="bg-gray-200 h-10 w-full rounded" />
      </div>
    ))}
  </div>
);

export default Home;