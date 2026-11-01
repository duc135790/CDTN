import Staff from '../models/staffModel.js';
import mongoose from 'mongoose';
import generateToken from '../utils/generateToken.js';
import { cleanText, httpError, normalizeEmail, normalizePhone, validatePassword } from '../utils/validation.js';
import { withAdminRoleGuard } from '../utils/adminGuard.js';
import { staffProfile as profileOf } from '../utils/accountProfile.js';

const requireAdmin = req => { if (!req.user?.isAdmin) throw httpError(403, 'Yêu cầu quyền quản trị'); };
const requireId = id => { if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, 'Mã nhân viên không hợp lệ'); };
const rejectUnknown = (body, fields) => {
  if (Object.keys(body).some(key => !fields.includes(key))) throw httpError(400, 'Thông tin cập nhật nhân viên không hợp lệ');
};

export const registerStaff = async (req, res) => {
  requireAdmin(req);
  rejectUnknown(req.body, ['email', 'password', 'name', 'phone', 'role', 'isAdmin']);
  const email = normalizeEmail(req.body.email);
  const password = validatePassword(req.body.password);
  const name = cleanText(req.body.name, 'Họ tên nhân viên', { max: 100 });
  const phone = normalizePhone(req.body.phone);
  if (req.body.role !== undefined && !['staff', 'Nhân viên'].includes(req.body.role)) throw httpError(400, 'Chỉ hỗ trợ vai trò nhân viên');
  if (req.body.isAdmin !== undefined && req.body.isAdmin !== false) throw httpError(400, 'Không được cấp quyền admin qua chức năng tạo nhân viên');
  if (await Staff.exists({ email })) throw httpError(409, 'Email nhân viên đã tồn tại');
  const staff = await Staff.create({ email, password, name, phone, role: 'staff', isAdmin: false });
  res.status(201).json(profileOf(staff));
};

export const loginStaff = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (typeof req.body.password !== 'string') throw httpError(400, 'Vui lòng nhập mật khẩu');
  const staff = await Staff.findOne({ email });
  if (!staff || !(await staff.matchPassword(req.body.password))) throw httpError(401, 'Email hoặc mật khẩu không chính xác');
  if (staff.isActive === false) throw httpError(403, 'Tài khoản nhân viên đã bị vô hiệu hóa');
  res.json({
    ...profileOf(staff),
    token: generateToken(staff._id, { authVersion: staff.authVersion, accountType: 'staff' }),
  });
};

export const getStaffProfile = async (req, res) => res.json(profileOf(req.user));

export const updateStaffProfile = async (req, res) => {
  rejectUnknown(req.body, ['name', 'phone', 'currentPassword', 'password']);
  const staff = await Staff.findById(req.user._id);
  if (!staff || staff.isActive === false || (staff.authVersion ?? 0) !== (req.user.authVersion ?? 0)) throw httpError(401, 'Phiên đăng nhập đã thay đổi');
  if (req.body.name !== undefined) staff.name = cleanText(req.body.name, 'Họ tên', { max: 100 });
  if (req.body.phone !== undefined) staff.phone = normalizePhone(req.body.phone);
  if (req.body.password !== undefined) {
    if (typeof req.body.currentPassword !== 'string' || !(await staff.matchPassword(req.body.currentPassword))) throw httpError(400, 'Mật khẩu hiện tại không chính xác');
    staff.password = validatePassword(req.body.password);
    staff.authVersion = (staff.authVersion ?? 0) + 1;
  }
  await staff.save();
  res.json({ ...profileOf(staff), token: generateToken(staff._id, { accountType: 'staff', authVersion: staff.authVersion }) });
};

export const getStaff = async (req, res) => {
  requireAdmin(req);
  const rows = await Staff.find().select('_id name email phone isAdmin isActive hireDate').sort({ hireDate: -1 });
  res.json(rows.map(profileOf));
};

export const updateStaff = async (req, res) => {
  requireAdmin(req);
  requireId(req.params.id);
  rejectUnknown(req.body, ['name', 'phone', 'isActive', 'password']);
  if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') throw httpError(400, 'Trạng thái tài khoản không hợp lệ');
  const result = await withAdminRoleGuard(req, async () => {
    const staff = await Staff.findById(req.params.id);
    if (!staff) throw httpError(404, 'Không tìm thấy nhân viên');
    // Existing Staff administrators remain supported, but this screen cannot
    // demote/disable them or bypass the last-administrator invariant.
    if (staff.isAdmin) throw httpError(403, 'Chức năng này chỉ quản lý nhân viên, không thay đổi tài khoản quản trị');
    if (req.body.name !== undefined) staff.name = cleanText(req.body.name, 'Họ tên', { max: 100 });
    if (req.body.phone !== undefined) staff.phone = normalizePhone(req.body.phone);
    if (req.body.isActive !== undefined) staff.isActive = req.body.isActive;
    if (req.body.password !== undefined) staff.password = validatePassword(req.body.password);
    // Revoke earlier sessions after every administrative account edit.
    staff.authVersion = (staff.authVersion ?? 0) + 1;
    await staff.save();
    return profileOf(staff);
  });
  res.json(result);
};
