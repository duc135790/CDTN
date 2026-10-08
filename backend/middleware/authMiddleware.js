import jwt from 'jsonwebtoken';
import Customer from '../models/customerModel.js'; // ✅ ĐÚNG: Dùng Customer thay vì User

// Middleware bảo vệ route (yêu cầu đăng nhập)
const protect = async (req, res, next) => {
    let token;

    // Đọc token từ header 'Authorization'
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Lấy token
            token = req.headers.authorization.split(' ')[1];
            
            console.log('🔐 Token received:', token.substring(0, 20) + '...');
            
            // Giải mã token để lấy id
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            console.log('✅ Token decoded, userId:', decoded.id);
            
            // ✅ QUAN TRỌNG: Tìm user từ Customer model (không phải User)
            req.user = await Customer.findById(decoded.id).select('-password');
            
            if (!req.user) {
                console.error('❌ Customer not found with id:', decoded.id);
                return res.status(401).json({ 
                    message: 'Không tìm thấy người dùng, vui lòng đăng nhập lại' 
                });
            }
            
            console.log('✅ User found:', req.user.email);
            next();
        } catch (error) {
            console.error('❌ Token verification failed:', error.message);
            res.status(401).json({ 
                message: 'Token không hợp lệ, vui lòng đăng nhập lại' 
            });
        }
    } else {
        console.error('❌ No token provided');
        res.status(401).json({ 
            message: 'Vui lòng đăng nhập để tiếp tục' 
        });
    }
};

// Middleware kiểm tra quyền admin
const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ 
            message: 'Không có quyền truy cập, yêu cầu quyền Admin' 
        });
    }
};

export { protect, admin };