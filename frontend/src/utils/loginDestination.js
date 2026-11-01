export const loginDestination = (user, from) => {
  const fallback = user?.isAdmin === true ? '/admin' : user?.accountType === 'staff' ? '/staff' : '/';
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || /[\\\s\x00-\x1f\x7f]/.test(from)) return fallback;
  const pathname = from.split(/[?#]/)[0].toLowerCase();
  if (/^\/(?:login|register|forgot-password|reset-password)(?:\/|$)/.test(pathname) || pathname === '/staff/login' || pathname.startsWith('/staff/login/')) return fallback;
  if (/^\/admin(?:\/|$)/.test(pathname)) return user?.isAdmin === true ? from : fallback;
  if (/^\/staff(?:\/|$)/.test(pathname)) return user?.accountType === 'staff' ? from : fallback;
  return user?.accountType === 'staff' ? fallback : from;
};
