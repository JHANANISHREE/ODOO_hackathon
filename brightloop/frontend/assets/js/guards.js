import { getCurrentUser, getAccessToken, clearTokens } from './api.js';

export function enforceAuthGuard(allowedRoles = []) {
  const token = getAccessToken();
  const user = getCurrentUser();

  if (!token || !user) {
    clearTokens();
    const currentPath = encodeURIComponent(window.location.pathname);
    window.location.href = `/login.html?redirect=${currentPath}`;
    return false;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'CUSTOMER') {
      window.location.href = '/portal/my-subscriptions.html';
    } else {
      window.location.href = '/admin/dashboard.html';
    }
    return false;
  }

  return true;
}

export function requireRole(allowedRoles = []) {
  return enforceAuthGuard(allowedRoles);
}

export function requireAuth(allowedRoles = []) {
  return enforceAuthGuard(allowedRoles);
}

export function redirectIfAuthenticated() {
  const token = getAccessToken();
  const user = getCurrentUser();

  if (token && user) {
    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      window.location.href = '/admin/dashboard.html';
    } else {
      window.location.href = '/portal/my-subscriptions.html';
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#logout-btn, #admin-logout-btn, #sidebar-logout-btn, .logout-btn, [data-action="logout"]');
    if (target) {
      e.preventDefault();
      clearTokens();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login.html';
    }
  });
}
