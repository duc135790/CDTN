import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Thêm FaUser vào đây
import { FaShoePrints, FaShoppingCart, FaBoxOpen, FaSearch, FaBars, FaTimes, FaCog, FaUser } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchTerm.trim())}`);
      setMobileMenuOpen(false);
      setSearchTerm('');
    } else {
      navigate('/products');
    }
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[100] shadow-md">
      {/* Header Top - Dark */}
      <div className="bg-gray-900 text-white py-2">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <div className="hidden sm:block">📞 Hotline: 1900-xxxx | 📧 support@shoestore.vn</div>
            <div className="sm:hidden">📞 1900-xxxx</div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              {user ? (
                <>
                  <span className="hidden sm:inline">Xin chào, <strong>{user.name || user.email}</strong></span>
                  {user.isAdmin && (
                    <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold">ADMIN</span>
                  )}
                  <button onClick={handleLogout} className="hover:text-red-400 transition-colors">Đăng xuất</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-blue-400 transition-colors">Đăng nhập</Link>
                  <Link to="/register" className="hover:text-blue-400 transition-colors">Đăng ký</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header Main - White */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 text-xl sm:text-2xl font-bold hover:scale-105 transition-transform">
              <span className="text-gray-800">SHOE</span>
              <span className="text-red-600">STORE</span>
            </Link>

            {/* Search Box - Desktop */}
            <div className="hidden md:flex flex-1 max-w-lg mx-10">
              <form onSubmit={handleSearch} className="relative w-full">
                <input
                  type="text"
                  placeholder="Tìm kiếm giày..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="absolute right-4 top-3 text-gray-400 hover:text-blue-500">
                  <FaSearch />
                </button>
              </form>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/products" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all font-medium">
                <FaShoePrints /><span>Sản phẩm</span>
              </Link>

              {user && (
                <>
                  <Link to="/cart" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all font-medium">
                    <FaShoppingCart /><span>Giỏ hàng</span>
                  </Link>
                  <Link to="/my-orders" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all font-medium">
                    <FaBoxOpen /><span>Đơn hàng</span>
                  </Link>
                  <Link to="/profile" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all font-medium">
                    <FaUser /><span>Tài khoản</span>
                  </Link>
                  {user.isAdmin && (
                    <Link to="/admin" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all font-medium">
                      <FaCog /><span>Quản trị</span>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={closeMobileMenu}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Menu</h3>
                <button onClick={closeMobileMenu} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FaTimes className="text-xl text-gray-700" />
                </button>
              </div>

              <nav className="space-y-2">
                <Link to="/products" onClick={closeMobileMenu} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all">
                  <FaShoePrints /><span>Sản phẩm</span>
                </Link>

                {user && (
                  <>
                    <Link to="/cart" onClick={closeMobileMenu} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all">
                      <FaShoppingCart /><span>Giỏ hàng</span>
                    </Link>
                    <Link to="/my-orders" onClick={closeMobileMenu} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all">
                      <FaBoxOpen /><span>Đơn hàng</span>
                    </Link>
                    <Link to="/profile" onClick={closeMobileMenu} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all">
                      <FaUser /><span>Tài khoản</span>
                    </Link>
                    {user.isAdmin && (
                      <Link to="/admin" onClick={closeMobileMenu} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all">
                        <FaCog /><span>Quản trị</span>
                      </Link>
                    )}
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;