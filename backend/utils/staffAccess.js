import { httpError } from './validation.js';

export const STAFF_PERMISSIONS = Object.freeze(['inventory:read', 'chat:consult', 'products:recommend']);
export const isStaff = req => req.accountType === 'staff';
export const requireStaffAccount = (req, res, next) => {
  if (!isStaff(req)) return next(httpError(403, 'Vui lòng dùng tài khoản nhân viên'));
  next();
};
export const requireStaffOrAdmin = (req, res, next) => {
  if (isStaff(req) || req.user?.isAdmin) return next();
  next(httpError(403, 'Chỉ nhân viên tư vấn hoặc admin được tra cứu kho'));
};
export const requireCustomerOrAdmin = (req, res, next) => {
  if (req.accountType !== 'customer' && !req.user?.isAdmin) return next(httpError(403, 'Nhân viên không có quyền thực hiện thao tác này'));
  next();
};
export const orderActivity = (req, action, from, to, note = '') => ({
  actor: req.user._id, accountType: req.accountType || 'customer',
  actorName: req.user.name || req.user.email || String(req.user._id), action, from: String(from || ''), to: String(to || ''), note, at: new Date(),
});
