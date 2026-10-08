import Customer from "../models/customerModel.js";
import generateToken from "../utils/generateToken.js";
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';

// @desc    Đăng ký khách hàng mới
// @route   POST /api/customers
const registerCustomer = async (req, res, next) => {
    const { email, name, phone, password } = req.body;

    try {
        if (!email || !password || !name || !phone) {
            res.status(400);
            throw new Error("Vui lòng điền đầy đủ thông tin: Tên, Email, SĐT và Mật khẩu");
        }

        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            res.status(400);
            throw new Error("Số điện thoại không hợp lệ (Phải có 10 số và bắt đầu bằng số 0)");
        }

        const customerExists = await Customer.findOne({ email });
        if (customerExists) {
            res.status(400);
            throw new Error("Email đã tồn tại");
        }

        const customer = await Customer.create({ email, name, phone, password });

        if (customer) {
            res.status(201).json({
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                token: generateToken(customer._id),
            });
        } else {
            res.status(400);
            throw new Error("Dữ liệu khách hàng không hợp lệ");
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Đăng nhập
// @route   POST /api/customer/login
const loginCustomer = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const customer = await Customer.findOne({ email });

        if (customer && customer.isActive === false) {
            res.status(403);
            throw new Error("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin.");
        }

        if (customer && (await customer.matchPassword(password))) {
            res.json({
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                isAdmin: customer.isAdmin,
                token: generateToken(customer._id),
            });
        } else {
            res.status(401);
            throw new Error("Email hoặc mật khẩu không chính xác");
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Lấy giỏ hàng
const getCustomerCart = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.user._id).populate('cart.product');
        
        if(!customer){
            res.status(404);
            throw new Error('Không tìm thấy khách hàng');
        }

        const validCart = customer.cart.filter(item => item.product);
        res.json(validCart);
    } catch (error) {
        next(error);
    }
};

// @desc    Thêm vào giỏ hàng
const addItemToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    
    const customer = await Customer.findById(req.user._id);
    const product = await Product.findById(productId);

    if (!product) {
      res.status(404);
      throw new Error('Không tìm thấy sản phẩm');
    }

    if (product.countInStock === 0) {
      res.status(400);
      throw new Error('Sản phẩm đã hết hàng');
    }

    const cartItemIndex = customer.cart.findIndex(
      (item) => item.product.toString() === productId
    );

    if (cartItemIndex > -1) {
      const newQuantity = customer.cart[cartItemIndex].quantity + Number(quantity);
      
      if (newQuantity > product.countInStock) {
        res.status(400);
        throw new Error(`Chỉ còn ${product.countInStock} sản phẩm. Bạn đã có ${customer.cart[cartItemIndex].quantity} trong giỏ.`);
      }
      
      customer.cart[cartItemIndex].quantity = newQuantity;
    } else {
      if (Number(quantity) > product.countInStock) {
        res.status(400);
        throw new Error(`Chỉ còn ${product.countInStock} sản phẩm`);
      }
      
      const newItem = {
        product: productId,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: Number(quantity),
      };
      customer.cart.push(newItem);
    }

    await customer.save();
    await customer.populate('cart.product');
    
    res.status(201).json(customer.cart);

  } catch (error) {
    next(error);
  }
};

// @desc    Xóa khỏi giỏ hàng
const removeItemFromCart = async(req, res, next) => {
    try {
        const {productId} = req.params;
        const customer = await Customer.findById(req.user._id);

        if(!customer){
            res.status(404);
            throw new Error('Không tìm thấy khách hàng');
        }

        customer.cart = customer.cart.filter(
            (item) => item.product.toString() !== productId
        );
        
        await customer.save();
        await customer.populate('cart.product');
        
        res.json(customer.cart);
    } catch (error) {
        next(error);
    }
};

// @desc    Cập nhật số lượng giỏ hàng
const updateCartItemQuantity = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const customer = await Customer.findById(req.user._id);

    if (customer) {
      const itemIndex = customer.cart.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        customer.cart[itemIndex].quantity = Number(quantity);
        await customer.save();
        await customer.populate('cart.product');
        res.json(customer.cart);
      } else {
        res.status(404);
        throw new Error('Sản phẩm không có trong giỏ hàng');
      }
    } else {
      res.status(404);
      throw new Error('Không tìm thấy khách hàng');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin profile
const getCustomerProfile = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.user._id);
        if (customer) {
            res.json({
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                isAdmin: customer.isAdmin,
            });
        } else {
            res.status(404);
            throw new Error('Không tìm thấy người dùng');
        }
    } catch (error) {
        next(error);
    }
};

// ✅ @desc    Cập nhật profile USER (có kiểm tra mật khẩu cũ) - FIXED
// @route   PUT /api/customers/profile
const updateUserProfile = async (req, res, next) => {
    try {
        console.log('🔄 Update profile request:', {
            userId: req.user._id,
            body: { ...req.body, currentPassword: '***', newPassword: '***' }
        });

        const customer = await Customer.findById(req.user._id);
        
        if (!customer) {
            res.status(404);
            throw new Error('Không tìm thấy người dùng');
        }

        // ✅ KIỂM TRA: Nếu có đổi mật khẩu
        if (req.body.newPassword) {
            console.log('🔐 Attempting password change');
            
            // ✅ BẮT BUỘC phải có mật khẩu cũ
            if (!req.body.currentPassword) {
                res.status(400);
                throw new Error('Vui lòng nhập mật khẩu cũ để đổi mật khẩu');
            }

            // ✅ KIỂM TRA MẬT KHẨU CŨ
            const isMatch = await customer.matchPassword(req.body.currentPassword);
            console.log('🔍 Password match:', isMatch);
            
            if (!isMatch) {
                res.status(401);
                throw new Error('Mật khẩu cũ không đúng');
            }

            // ✅ Validate mật khẩu mới
            if (req.body.newPassword.length < 6) {
                res.status(400);
                throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
            }

            // ✅ Lưu mật khẩu mới
            customer.password = req.body.newPassword;
            console.log('✅ Password will be updated');
        }

        // ✅ Cập nhật thông tin khác (không cần mật khẩu)
        if (req.body.name) {
            customer.name = req.body.name;
        }
        
        if (req.body.phone) {
            const phoneRegex = /^0\d{9}$/;
            if (!phoneRegex.test(req.body.phone)) {
                res.status(400);
                throw new Error('Số điện thoại không hợp lệ (Phải có 10 số và bắt đầu bằng số 0)');
            }
            customer.phone = req.body.phone;
        }

        const updatedCustomer = await customer.save();
        console.log('✅ Customer updated successfully');
        
        res.json({
            _id: updatedCustomer._id,
            name: updatedCustomer.name,
            email: updatedCustomer.email,
            phone: updatedCustomer.phone,
            isAdmin: updatedCustomer.isAdmin,
            token: generateToken(updatedCustomer._id),
        });
    } catch (error) {
        console.error('❌ Update profile error:', error);
        next(error);
    }
};

// ✅ @desc    Admin cập nhật thông tin khách hàng
// @route   PUT /api/customers/:id/update-info
const updateCustomerByAdmin = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            res.status(404);
            throw new Error('Không tìm thấy khách hàng');
        }

        // ✅ Admin có thể đổi: name, phone, password (không cần mật khẩu cũ)
        customer.name = req.body.name || customer.name;
        customer.phone = req.body.phone || customer.phone;

        if (req.body.password) {
            customer.password = req.body.password;
        }

        // Validate phone
        if (req.body.phone) {
            const phoneRegex = /^0\d{9}$/;
            if (!phoneRegex.test(req.body.phone)) {
                res.status(400);
                throw new Error('Số điện thoại không hợp lệ');
            }
        }

        const updatedCustomer = await customer.save();
        
        res.json({
            _id: updatedCustomer._id,
            name: updatedCustomer.name,
            email: updatedCustomer.email,
            phone: updatedCustomer.phone,
            isAdmin: updatedCustomer.isAdmin,
        });
    } catch (error) {
        next(error);
    }
};

const clearCart = async(req, res, next) => {
    try {
        const customer = await Customer.findById(req.user._id);
        if(customer) {
            customer.cart = [];
            await customer.save();
            res.json({ message: 'Đã xóa giỏ hàng' });
        } else {
            res.status(404);
            throw new Error('Không tìm thấy khách hàng');
        }
    } catch (error) {
        next(error);
    }
};

const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find({}).select('-password').sort({ createdAt: -1 });
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({ user: customer._id });
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        return { ...customer.toObject(), totalOrders, totalSpent };
      })
    );
    res.json(customersWithStats);
  } catch (error) {
    next(error);
  }
};

const toggleCustomerAdmin = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404);
      throw new Error('Không tìm thấy khách hàng');
    }
    customer.isAdmin = !customer.isAdmin;
    await customer.save();
    res.json({ message: customer.isAdmin ? 'Đã cấp quyền admin' : 'Đã gỡ quyền admin' });
  } catch (error) {
    next(error);
  }
};

const toggleCustomerActive = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404);
      throw new Error('Không tìm thấy khách hàng');
    }
    if (customer.isAdmin) {
      res.status(400);
      throw new Error('Không thể vô hiệu hóa tài khoản admin');
    }
    customer.isActive = !customer.isActive;
    await customer.save();
    res.json({ message: customer.isActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản' });
  } catch (error) {
    next(error);
  }
};

export {
    registerCustomer,
    loginCustomer,
    getCustomerCart,
    addItemToCart,
    removeItemFromCart,
    getCustomerProfile,
    updateUserProfile,
    updateCustomerByAdmin,
    updateCartItemQuantity,
    clearCart,
    getAllCustomers,
    toggleCustomerAdmin,
    toggleCustomerActive,
};