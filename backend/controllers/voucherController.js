// backend/controllers/voucherController.js - FIXED VERSION

import Voucher from '../models/voucherModel.js';

// Lấy tất cả voucher đang active
export const getActiveVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({ 
      isActive: true,
      endDate: { $gte: new Date() }
    }).sort({ createdAt: -1 });
    
    res.json(vouchers);
  } catch (error) {
    console.error('❌ Error fetching vouchers:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách voucher' });
  }
};

// Kiểm tra và áp dụng voucher
export const applyVoucher = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    
    if (!code || !orderTotal) {
      return res.status(400).json({ 
        message: 'Thiếu thông tin code hoặc orderTotal' 
      });
    }

    const voucher = await Voucher.findOne({ 
      code: code.toUpperCase().trim() 
    });
    
    if (!voucher) {
      return res.status(404).json({ 
        message: 'Mã voucher không tồn tại' 
      });
    }
    
    if (!voucher.isActive) {
      return res.status(400).json({ 
        message: 'Mã voucher đã bị vô hiệu hóa' 
      });
    }
    
    if (new Date() < voucher.startDate) {
      return res.status(400).json({ 
        message: 'Mã voucher chưa có hiệu lực' 
      });
    }
    
    if (new Date() > voucher.endDate) {
      return res.status(400).json({ 
        message: 'Mã voucher đã hết hạn' 
      });
    }
    
    if (voucher.usedCount >= voucher.maxUses) {
      return res.status(400).json({ 
        message: 'Mã voucher đã hết lượt sử dụng' 
      });
    }
    
    if (orderTotal < voucher.minOrder) {
      return res.status(400).json({ 
        message: `Đơn hàng tối thiểu ${voucher.minOrder.toLocaleString()}₫ để áp dụng mã này` 
      });
    }
    
    let discountAmount = 0;
    if (voucher.type === 'fixed') {
      discountAmount = voucher.discount;
    } else if (voucher.type === 'percent') {
      discountAmount = Math.round(orderTotal * voucher.discount / 100);
    } else if (voucher.type === 'shipping') {
      discountAmount = voucher.discount;
    }
    
    res.json({
      voucher: voucher,
      discountAmount: discountAmount,
      message: 'Áp dụng voucher thành công'
    });
    
  } catch (error) {
    console.error('❌ Error applying voucher:', error);
    res.status(500).json({ message: 'Lỗi khi áp dụng voucher' });
  }
};

// Tăng số lần sử dụng voucher
export const useVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({ message: 'Không tìm thấy voucher' });
    }
    
    if (voucher.usedCount >= voucher.maxUses) {
      return res.status(400).json({ message: 'Voucher đã hết lượt sử dụng' });
    }
    
    voucher.usedCount += 1;
    await voucher.save();
    
    res.json({ message: 'Đã cập nhật số lần sử dụng voucher' });
  } catch (error) {
    console.error('❌ Error using voucher:', error);
    res.status(500).json({ message: 'Lỗi khi sử dụng voucher' });
  }
};

// Tạo voucher mới (Admin)
export const createVoucher = async (req, res) => {
  try {
    const { code, description, discount, type, minOrder, maxUses, startDate, endDate } = req.body;
    
    const voucherExists = await Voucher.findOne({ code: code.toUpperCase() });
    if (voucherExists) {
      return res.status(400).json({ message: 'Mã voucher đã tồn tại' });
    }
    
    const voucher = await Voucher.create({
      code: code.toUpperCase(),
      description,
      discount,
      type,
      minOrder: minOrder || 0,
      maxUses: maxUses || 100,
      startDate: startDate || Date.now(),
      endDate,
      isActive: true
    });
    
    res.status(201).json(voucher);
  } catch (error) {
    console.error('❌ Error creating voucher:', error);
    res.status(400).json({ message: error.message });
  }
};

// Cập nhật voucher (Admin)
export const updateVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({ message: 'Không tìm thấy voucher' });
    }
    
    const { code, description, discount, type, minOrder, maxUses, startDate, endDate, isActive } = req.body;
    
    voucher.code = code?.toUpperCase() || voucher.code;
    voucher.description = description || voucher.description;
    voucher.discount = discount !== undefined ? discount : voucher.discount;
    voucher.type = type || voucher.type;
    voucher.minOrder = minOrder !== undefined ? minOrder : voucher.minOrder;
    voucher.maxUses = maxUses !== undefined ? maxUses : voucher.maxUses;
    voucher.startDate = startDate || voucher.startDate;
    voucher.endDate = endDate || voucher.endDate;
    voucher.isActive = isActive !== undefined ? isActive : voucher.isActive;
    
    const updatedVoucher = await voucher.save();
    res.json(updatedVoucher);
  } catch (error) {
    console.error('❌ Error updating voucher:', error);
    res.status(400).json({ message: error.message });
  }
};

// ✅ ẨN/HIỆN VOUCHER - FIXED
export const toggleVoucherVisibility = async (req, res) => {
  try {
    console.log('🔄 Toggle visibility for voucher:', req.params.id);
    
    const voucher = await Voucher.findById(req.params.id);
    
    if (!voucher) {
      console.log('❌ Voucher not found');
      return res.status(404).json({ message: 'Không tìm thấy voucher' });
    }
    
    console.log('📦 Current isActive:', voucher.isActive);
    
    // ✅ TOGGLE: Nếu true → false, nếu false → true
    voucher.isActive = !voucher.isActive;
    
    console.log('📦 New isActive:', voucher.isActive);
    
    const updatedVoucher = await voucher.save();
    
    console.log('✅ Voucher updated successfully');
    
    res.json({
      success: true,
      message: voucher.isActive ? 'Đã kích hoạt voucher' : 'Đã ẩn voucher',
      voucher: updatedVoucher
    });
  } catch (error) {
    console.error('❌ Toggle visibility error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi ẩn/hiện voucher' 
    });
  }
};

// Xóa voucher (Admin)
export const deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({ message: 'Không tìm thấy voucher' });
    }
    
    await Voucher.deleteOne({ _id: voucher._id });
    res.json({ message: 'Đã xóa voucher' });
  } catch (error) {
    console.error('❌ Error deleting voucher:', error);
    res.status(500).json({ message: 'Lỗi khi xóa voucher' });
  }
};

// Lấy tất cả voucher (Admin)
export const getAllVouchersAdmin = async (req, res) => {
  try {
    const vouchers = await Voucher.find({}).sort({ createdAt: -1 });
    res.json(vouchers);
  } catch (error) {
    console.error('❌ Error fetching all vouchers:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách voucher' });
  }
};