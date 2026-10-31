import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast } from '/assets/js/ui.js';
import { validatePassword } from '/assets/js/validators.js';

requireRole(['CUSTOMER', 'ADMIN', 'STAFF']);

const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');
const profilePhoneInput = document.getElementById('profile-phone');
const profileForm = document.getElementById('profile-form');

const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordForm = document.getElementById('password-form');

let currentUser = null;

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

async function loadProfile() {
  try {
    currentUser = await api.get('/auth/me');
    profileNameInput.value = currentUser.name || '';
    profileEmailInput.value = currentUser.email || '';
    profilePhoneInput.value = currentUser.phone || '';

    document.getElementById('customer-name-display').textContent = currentUser.name || 'Customer';
    document.getElementById('customer-email-display').textContent = currentUser.email || '';
  } catch (err) {
    showToast(err.message || 'Failed to load profile details', 'danger');
  }
}

profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  try {
    const payload = {
      name: profileNameInput.value.trim(),
      phone: profilePhoneInput.value.trim() || null
    };

    const updated = await api.put(`/users/${currentUser.id}`, payload);
    currentUser = updated;
    localStorage.setItem('user', JSON.stringify(updated));
    document.getElementById('customer-name-display').textContent = updated.name;
    showToast('Profile updated successfully', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update profile', 'danger');
  }
});

passwordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwd = newPasswordInput.value;
  const cpwd = confirmPasswordInput.value;

  if (pwd !== cpwd) {
    showToast('Passwords do not match', 'warning');
    return;
  }

  const v = validatePassword(pwd);
  if (!v.isValid) {
    showToast('Password does not meet complexity criteria', 'warning');
    return;
  }

  try {
    await api.put(`/users/${currentUser.id}`, { password: pwd });
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    showToast('Password updated successfully', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update password', 'danger');
  }
});

loadProfile();
