import { STAFF_PERMISSIONS } from './staffAccess.js';

export const customerProfile = customer => ({
  _id: customer._id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  ...(customer.shippingAddress ? { shippingAddress: customer.shippingAddress } : {}),
  accountType: 'customer',
  role: customer.isAdmin === true ? 'admin' : 'customer',
  isAdmin: customer.isAdmin === true,
  isActive: customer.isActive !== false,
});

export const staffProfile = staff => ({
  _id: staff._id, name: staff.name, email: staff.email, phone: staff.phone,
  role: staff.isAdmin === true ? 'admin' : 'staff', accountType: 'staff', isAdmin: staff.isAdmin === true,
  isActive: staff.isActive !== false, permissions: STAFF_PERMISSIONS,
});
