import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock } from 'react-icons/fa';
import AuthLayout from '../components/AuthLayout';

const Login = ({ staff = false }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = staff ? await login(formData.email, formData.password, { accountType: 'staff' }) : await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      const destination = location.state?.from;
      navigate(staff ? '/staff' : typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//') ? destination : '/', { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-md w-full">
        <div className="mb-8">
          <p className="shop-eyebrow">{staff ? 'NHÂN VIÊN SHOE STORE' : 'TÀI KHOẢN SHOE STORE'}</p>
          <h1 className="shop-auth__title">{staff ? 'Không gian làm việc' : 'Chào mừng bạn trở lại'}</h1>
          <p className="text-sm text-gray-600">{staff ? 'Dùng tài khoản nhân viên do quản trị viên cấp.' : 'Đăng nhập để tiếp tục mua sắm cùng chúng tôi.'}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 shop-panel">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <FaUser className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Nhập email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Nhập mật khẩu"
                />
              </div>
            </div>

            {!staff && <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-red-600 hover:underline font-medium">
                Quên mật khẩu?
              </Link>
            </div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {staff ? <p>Quên mật khẩu? Liên hệ quản trị viên để đặt lại.</p> : <>Chưa có tài khoản?{' '}
            <Link to="/register" className="text-red-600 font-semibold hover:underline">
              Đăng ký ngay
            </Link></>}
            <Link className="block mt-3 text-red-600 hover:underline" to={staff ? '/login' : '/staff/login'}>{staff ? 'Đăng nhập khách hàng' : 'Đăng nhập nhân viên'}</Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
