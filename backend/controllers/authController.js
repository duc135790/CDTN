import Customer from '../models/customerModel.js';
import Staff from '../models/staffModel.js';
import generateToken from '../utils/generateToken.js';
import { customerProfile, staffProfile } from '../utils/accountProfile.js';
import { httpError, normalizeEmail } from '../utils/validation.js';

export const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    throw httpError(400, 'Vui lòng nhập mật khẩu hợp lệ');
  }

  // Both collections can contain an existing email. Verify both credentials;
  // never choose an account or grant a role supplied by the browser.
  const accounts = await Promise.all([Customer.findOne({ email }), Staff.findOne({ email })]);
  const matches = await Promise.all(accounts.map(account => account ? account.matchPassword(password) : false));
  const matching = accounts.map((account, index) => matches[index] ? index : -1).filter(index => index >= 0);
  if (!matching.length) throw httpError(401, 'Email hoặc mật khẩu không chính xác');
  if (matching.length > 1) {
    throw httpError(409, 'Email và mật khẩu trùng ở hai tài khoản. Vui lòng liên hệ quản trị viên để dùng email riêng cho từng tài khoản');
  }

  const index = matching[0];
  const account = accounts[index];
  if (account.isActive === false) throw httpError(403, 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ cửa hàng');
  const profile = index === 1 ? staffProfile(account) : customerProfile(account);
  res.json({
    ...profile,
    token: generateToken(account._id, { authVersion: account.authVersion, accountType: profile.accountType }),
  });
};
