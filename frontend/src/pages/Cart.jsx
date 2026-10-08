import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cartAPI } from '../utils/api';
import { FaShoppingCart, FaTrash, FaMinus, FaPlus, FaArrowLeft } from 'react-icons/fa';

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      const response = await cartAPI.getCart();
      console.log('📦 Cart data:', response.data);
      setCartItems(response.data);
    } catch (error) {
      console.error('❌ Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const cartItem = cartItems.find(item => item.product._id === productId);
    if (!cartItem) return;
    
    const maxStock = cartItem.product.countInStock || 100;
    
    if (newQuantity > maxStock) {
      alert(`Chỉ còn ${maxStock} sản phẩm trong kho`);
      return;
    }
    
    setUpdating(true);
    try {
      const response = await cartAPI.updateCartItem(productId, newQuantity);
      setCartItems(response.data);
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert(error.response?.data?.message || 'Cập nhật số lượng thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (productId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    
    setUpdating(true);
    try {
      const response = await cartAPI.removeFromCart(productId);
      setCartItems(response.data);
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Xóa sản phẩm thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const handleCheckout = () => {
    console.log('🛒 Navigating to /checkout');
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-lg shadow">
            <FaShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-600 mb-6">
              Đăng nhập để xem giỏ hàng hoặc khám phá sản phẩm ngay!
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/login"
                className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/products"
                className="bg-white border-2 border-red-600 text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                Mua sắm ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-lg shadow">
            <FaShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-xl font-medium mb-2">Giỏ hàng trống</p>
            <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng!</p>
            <Link
              to="/products"
              className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Mua sắm ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/products" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
            <FaArrowLeft className="mr-2" />
            Tiếp tục mua sắm
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
          <FaShoppingCart className="text-red-600" />
          Giỏ hàng của bạn
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.product._id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  <Link to={`/products/${item.product._id}`} className="flex-shrink-0">
                    <img
                      src={item.product.image || item.image}
                      alt={item.product.name || item.name}
                      className="w-24 h-24 object-cover rounded"
                      onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
                    />
                  </Link>

                  <div className="flex-grow">
                    <Link 
                      to={`/products/${item.product._id}`}
                      className="font-semibold text-gray-800 hover:text-red-600 line-clamp-2 mb-2"
                    >
                      {item.product.name || item.name}
                    </Link>
                    
                    <p className="text-red-600 font-bold text-lg mb-2">
                      {(item.price || item.product.price).toLocaleString()}₫
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                          disabled={updating || item.quantity <= 1}
                          className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaMinus className="text-sm" />
                        </button>
                        <span className="px-4 py-1 border-x border-gray-300 font-semibold min-w-[50px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                          disabled={updating || item.quantity >= (item.product.countInStock || 100)}
                          className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaPlus className="text-sm" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product._id)}
                        disabled={updating}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {item.product.countInStock < 10 && (
                      <p className="text-sm text-orange-600 mt-2">
                        ⚠️ Chỉ còn {item.product.countInStock} sản phẩm
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Thành tiền</p>
                    <p className="text-lg font-bold text-gray-800">
                      {((item.price || item.product.price) * item.quantity).toLocaleString()}₫
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Tóm tắt đơn hàng</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({cartItems.length} sản phẩm)</span>
                  <span className="font-semibold">{calculateTotal().toLocaleString()}₫</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="text-green-600 font-semibold">Miễn phí</span>
                </div>
                
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-red-600">{calculateTotal().toLocaleString()}₫</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={updating}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                Tiến hành thanh toán
              </button>

              <Link
                to="/products"
                className="block text-center text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Tiếp tục mua sắm
              </Link>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-800 mb-3">🎁 Ưu đãi</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>✓ Miễn phí vận chuyển toàn quốc</li>
                  <li>✓ Đổi trả trong 7 ngày</li>
                  <li>✓ Bảo hành sản phẩm chính hãng</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;