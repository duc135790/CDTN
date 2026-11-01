import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StaffRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status" className="p-8 text-center">Đang kiểm tra tài khoản...</p>;
  return user?.accountType === 'staff' ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

export function ShoppingRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status" className="p-8 text-center">Đang kiểm tra tài khoản...</p>;
  return user?.accountType === 'staff' ? <Navigate to="/staff" replace /> : <Outlet />;
}
