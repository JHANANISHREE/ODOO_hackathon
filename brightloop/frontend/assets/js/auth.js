import { api, setTokens, clearTokens, setCurrentUser, getCurrentUser } from './api.js';
import { showToast } from './ui.js';

export async function loginUser(email, password) {
  try {
    const data = await api.post('/auth/login', { email, password });
    setTokens(data.access_token, data.refresh_token);
    setCurrentUser(data.user);

    showToast(`Welcome back, ${data.user.name}!`, 'success');

    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');

    if (redirectUrl) {
      window.location.href = decodeURIComponent(redirectUrl);
      return;
    }

    if (data.user.role === 'ADMIN' || data.user.role === 'STAFF') {
      window.location.href = '/admin/dashboard.html';
    } else {
      window.location.href = '/portal/my-subscriptions.html';
    }
  } catch (err) {
    showToast(err.message || 'Login failed. Please check credentials.', 'error');
    throw err;
  }
}

export async function signupUser(userData) {
  try {
    await api.post('/auth/signup', userData);
    showToast('Account created successfully! Signing in...', 'success');
    return loginUser(userData.email, userData.password);
  } catch (err) {
    showToast(err.message || 'Signup failed.', 'error');
    throw err;
  }
}

export function logoutUser() {
  clearTokens();
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/login.html';
}

export async function requestPasswordReset(email) {
  try {
    const res = await api.post('/auth/forgot-password', { email });
    showToast(res.message, 'success');
    return res;
  } catch (err) {
    showToast(err.message || 'Failed to request password reset', 'error');
    throw err;
  }
}

export async function resetPassword(token, newPassword) {
  try {
    const res = await api.post('/auth/reset-password', { token, new_password: newPassword });
    showToast(res.message, 'success');
    return res;
  } catch (err) {
    showToast(err.message || 'Failed to reset password', 'error');
    throw err;
  }
}

export async function fetchCurrentUserProfile() {
  try {
    const user = await api.get('/auth/me');
    setCurrentUser(user);
    return user;
  } catch (err) {
    return getCurrentUser();
  }
}
