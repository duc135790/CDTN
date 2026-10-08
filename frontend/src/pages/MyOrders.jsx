import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../utils/api';
import { FaBox, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaClock, FaTruck, FaTimesCircle } from 'react-icons/fa';

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getMyOrders();
      console.log('📦 Orders:', response.data);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const isConfirm = window.confirm(
      "⚠️ Bạn có chắc chắn muốn hủy đơn hàng này?\n\n" +
      "Số lượng sản phẩm sẽ được hoàn trả về kho."
    );
    
    if (!isConfirm) return;

    setCanceling(true);
    try {
      console.log('🚫 Canceling order:', orderId);
      const response = await ordersAPI.cancelOrder(orderId);
      console.log('✅ Cancel response:', response.data);
      
      alert("✅ Đã hủy đơn hàng thành công! Số lượng sản phẩm đã được hoàn trả.");
      
      // ✅ CRITICAL: Reload trang để cập nhật số lượng sản phẩm
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Cancel error:', error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi hủy đơn hàng.");
    } finally {
      setCanceling(false);
    }
  };

  const handleSupport = () => {
    window.location.href = "tel:1900xxxx";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Đang xử lý':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Đã xác nhận':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Đang giao':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Đã giao':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Đã hủy':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Đang xử lý':
        return <FaClock className="inline mr-1" />;
      case 'Đã xác nhận':
        return <FaCheckCircle className="inline mr-1" />;
      case 'Đang giao':
        return <FaTruck className="inline mr-1" />;
      case 'Đã giao':
        return <FaCheckCircle className="inline mr-1" />;
      case 'Đã hủy':
        return <FaTimesCircle className="inline mr-1" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-lg shadow">
            <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Chưa có đơn hàng</h2>
            <p className="text-gray-600 mb-6">
              Đăng nhập để xem đơn hàng hoặc bắt đầu mua sắm ngay!
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

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8 text-gray-800">Đơn hàng của tôi</h1>
          
          <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-lg shadow">
            <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-xl font-medium mb-2">Bạn chưa có đơn hàng nào</p>
            <p className="text-gray-500 mb-6">Hãy đặt hàng ngay để nhận ưu đãi!</p>
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
        <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
          <FaBox className="text-red-600" />
          Đơn hàng của tôi
        </h1>

        {canceling && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Đang hủy đơn hàng...</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Order Header */}
              <div className="border-b border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">Đơn hàng #{order._id.slice(-8)}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.orderStatus || 'Đang xử lý')}`}>
                        {getStatusIcon(order.orderStatus || 'Đang xử lý')}
                        {order.orderStatus || 'Đang xử lý'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-600 mb-1">Tổng tiền</p>
                    <p className="text-2xl font-bold text-red-600">{order.totalPrice.toLocaleString()}₫</p>
                  </div>
                </div>
              </div>

              {/* Order Body */}
              <div className="p-4 sm:p-6">
                {/* Order Items */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaBox className="text-blue-600" />
                    Sản phẩm đã đặt
                  </h4>
                  <div className="space-y-3">
                    {order.orderItems.map((item) => (
                      <div key={item._id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
                        />
                        <div className="flex-grow">
                          <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                          <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">
                            {(item.price * item.quantity).toLocaleString()}₫
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-blue-600" />
                      Địa chỉ giao hàng
                    </h4>
                    <p className="text-sm text-gray-700">
                      {order.shippingAddress.address}, {order.shippingAddress.city}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FaPhone className="text-blue-600" />
                      Số điện thoại
                    </h4>
                    <p className="text-sm text-gray-700">{order.shippingAddress.phone}</p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-sm text-gray-700">
                    <strong>Phương thức thanh toán:</strong> {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Trạng thái thanh toán:</strong> {order.isPaid ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  {order.orderStatus === 'Đang xử lý' && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      disabled={canceling}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {canceling ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang hủy...
                        </>
                      ) : (
                        <>
                          <FaTimesCircle />
                          Hủy đơn hàng
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={handleSupport}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                    Liên hệ hỗ trợ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;