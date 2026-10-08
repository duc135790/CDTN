// frontend/src/components/AdminLayout.jsx - GIAO DIỆN QUẢN TRỊ RIÊNG (không dùng Navbar cửa hàng)

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaChartBar, FaShoePrints, FaBoxOpen, FaTag, FaUsers, FaSignOutAlt,
} from 'react-icons/fa';

const menu = [
  { to: '/admin', label: 'Dashboard', icon: FaChartBar, end: true },
  { to: '/admin/products', label: 'Sản phẩm', icon: FaShoePrints },
  { to: '/admin/orders', label: 'Đơn hàng', icon: FaBoxOpen },
  { to: '/admin/vouchers', label: 'Vouchers', icon: FaTag },
  { to: '/admin/accounts', label: 'Tài khoản', icon: FaUsers },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      {/* SIDEBAR (máy tính) */}
      <aside className="hidden md:flex md:flex-col w-64 bg-[#0f172a] text-white fixed inset-y-0 left-0">
        <div className="px-6 py-6 border-b border-gray-800">
          <div className="text-2xl font-bold">
            <span>SHOE</span> <span className="text-red-500">ADMIN</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Trang quản trị</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menu.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
            <FaSignOutAlt /> <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* NỘI DUNG */}
      <div className="flex-1 md:ml-64 min-w-0">
        {/* Thanh trên cùng */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">Quản trị hệ thống</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="hidden sm:inline">
              Xin chào, <span className="font-semibold">{user?.name || user?.email}</span>
            </span>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">ADMIN</span>
          </div>
        </header>

        {/* Menu cho điện thoại */}
        <nav className="md:hidden bg-[#0f172a] px-2 py-2 flex gap-1 overflow-x-auto">
          {menu.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon /> <span>{label}</span>
            </NavLink>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-300 whitespace-nowrap">
            <FaSignOutAlt /> <span>Đăng xuất</span>
          </button>
        </nav>

        <main className="p-4 md:p-8">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;