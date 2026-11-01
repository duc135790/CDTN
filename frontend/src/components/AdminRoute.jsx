import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return user.isAdmin ? <Outlet /> : <Navigate to={user.accountType === 'staff' ? '/staff' : '/'} replace />;
};

export default AdminRoute;
