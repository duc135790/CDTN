// frontend/src/pages/Products.jsx - FIXED: Auto reload when return to page

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { productsAPI, cartAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FaShoePrints, FaShoppingCart, FaSearch } from 'react-icons/fa';

const Products = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const keywordParam = searchParams.get('keyword') || '';

  const [filter, setFilter] = useState(categoryParam);
  const [sortBy, setSortBy] = useState('newest');
  const [addingToCart, setAddingToCart] = useState({});

  // ✅ CRITICAL FIX: Reload khi quay lại trang
  useEffect(() => {
    console.log('🔄 Products page mounted/updated');
    fetchProducts();
    setFilter(categoryParam);
  }, [categoryParam, keywordParam, sortBy]);

  // ✅ THÊM: Reload khi focus vào window (quay lại tab)
  useEffect(() => {
    const handleFocus = () => {
      console.log('👁️ Window focused - reloading products');
      fetchProducts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [categoryParam, keywordParam, sortBy]);

  // ✅ THÊM: Reload khi visible (quay lại trang từ tab khác)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible - reloading products');
        fetchProducts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [categoryParam, keywordParam, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Fetching products with timestamp:', Date.now());
      
      // ✅ CRITICAL: Thêm timestamp để bypass cache
      const response = await productsAPI.getProducts(keywordParam, categoryParam);
      let sortedProducts = [...response.data];
      
      // Sorting logic
      switch(sortBy) {
        case 'price_asc':
          sortedProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          sortedProducts.sort((a, b) => b.price - a.price);
          break;
        case 'name_asc':
          sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'newest':
        default:
          sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
      }
      
      console.log(`✅ Loaded ${sortedProducts.length} products`);
      setProducts(sortedProducts);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    
    const newParams = {};
    if (value) newParams.category = value;
    if (keywordParam) newParams.keyword = keywordParam;
    
    setSearchParams(newParams);
  };

  const clearSearch = () => {
     const newParams = {};
     if (categoryParam) newParams.category = categoryParam;
     setSearchParams(newParams);
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
      await cartAPI.addToCart(productId, 1);
      
      // ✅ CRITICAL: Reload products sau khi thêm giỏ hàng
      await fetchProducts();
      
      alert('✅ Đã thêm vào giỏ hàng!');
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      alert('❌ Thêm vào giỏ hàng thất bại: ' + (error.response?.data?.message || error.message));
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-lg mt-4">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            <Link to="/" className="hover:text-red-600">Trang chủ</Link> /{' '}
            {categoryParam || keywordParam ? (
              <>
                {categoryParam ? (
                  <span className={keywordParam ? '' : 'text-gray-800 font-medium'}>{categoryParam}</span>
                ) : (
                  <Link to="/products" className="hover:text-red-600">Tất cả sản phẩm</Link>
                )}
                {keywordParam && (
                  <> / <span className="text-gray-800 font-medium">Tìm kiếm: "{keywordParam}"</span></>
                )}
              </>
            ) : (
              <span>Tất cả sản phẩm</span>
            )}
          </div>
        </div>
      </div>

      {/* Page Title */}
      <div className="text-center py-8 bg-white mb-5">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            {keywordParam ? `Kết quả tìm kiếm: "${keywordParam}"` : 'Giày Chính Hãng'}
        </h1>
        <p className="text-gray-600">Tìm thấy {products.length} sản phẩm</p>
        
        {/* ✅ THÊM: Hiển thị timestamp để check reload */}
        <p className="text-xs text-gray-400 mt-1">
          Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
        </p>
      </div>

      <div className="container mx-auto px-4 py-5">
        {/* Filter & Sort Bar */}
        <div className="bg-white p-5 rounded-lg mb-5 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Thể loại:</label>
              <select
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="border-2 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="Sneaker">Sneaker</option>
                <option value="Giày chạy bộ">Giày chạy bộ</option>
                <option value="Giày da">Giày da</option>
                <option value="Sandal">Sandal</option>
                <option value="Giày thể thao">Giày thể thao</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border-2 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="name_asc">Tên A-Z</option>
              </select>
            </div>

            {/* ✅ THÊM: Nút refresh thủ công */}
            <button
              onClick={() => fetchProducts()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="Tải lại danh sách"
            >
              🔄 Làm mới
            </button>
          </div>

          {(keywordParam || categoryParam) && (
              <button
                onClick={() => setSearchParams({})}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                ↻ Đặt lại tất cả
              </button>
          )}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg">
            <FaSearch className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-xl font-medium">Không tìm thấy sản phẩm nào</p>
            {keywordParam && (
                <button 
                    onClick={clearSearch}
                    className="mt-4 text-blue-600 hover:underline"
                >
                    Xóa từ khóa tìm kiếm
                </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product) => {
              const isOutOfStock = !product.countInStock || product.countInStock === 0;
              
              return (
                <Link
                  key={product._id}
                  to={`/products/${product._id}`}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-2 relative group cursor-pointer"
                >
                  {isOutOfStock ? (
                    <span className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                      Hết hàng
                    </span>
                  ) : product.inStock && (
                    <span className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                      Mới
                    </span>
                  )}

                  <div className="relative pt-[100%] overflow-hidden bg-gray-50">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`absolute top-0 left-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
                        onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=No+Image'}
                      />
                    ) : (
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <FaShoePrints className="text-white text-6xl opacity-50" />
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold">
                          HẾT HÀNG
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="text-sm font-semibold text-gray-800 group-hover:text-red-600 line-clamp-2 min-h-[40px]">
                        {product.name}
                      </h3>
                    </div>
                    
                    <div className="text-lg font-bold text-red-600 mb-2">
                      {product.price?.toLocaleString()}₫
                    </div>
                    
                    {/* ✅ CRITICAL: Hiển thị số lượng realtime */}
                    <div className={`text-xs mb-3 font-semibold ${isOutOfStock ? 'text-red-600' : product.countInStock < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                      {isOutOfStock ? '❌ Hết hàng' : `Còn: ${product.countInStock} sản phẩm`}
                      {!isOutOfStock && product.countInStock < 10 && ' ⚠️'}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          if (!isOutOfStock) handleAddToCart(product._id, e);
                          else {
                              e.preventDefault();
                              e.stopPropagation();
                          }
                        }}
                        disabled={addingToCart[product._id] || isOutOfStock}
                        className={`flex-1 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 text-xs ${
                          isOutOfStock 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-red-600 text-white hover:bg-red-700'
                        } disabled:opacity-50`}
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
                      <button className="px-3 bg-gray-100 text-gray-700 rounded-md font-medium text-xs hover:bg-gray-200 transition-colors">
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;