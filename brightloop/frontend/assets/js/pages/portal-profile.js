import { requireRole } from '/assets/js/guards.js';
import { api, setCurrentUser } from '/assets/js/api.js';
import { showToast } from '/assets/js/ui.js';
import { validatePassword } from '/assets/js/validators.js';
import { initPortalLayout } from '/assets/js/layout.js';

requireRole(['CUSTOMER', 'ADMIN', 'STAFF']);
initPortalLayout();

const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');
const profilePhoneInput = document.getElementById('profile-phone');
const profileForm = document.getElementById('profile-form');

const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordForm = document.getElementById('password-form');

let currentUser = null;

async function loadProfile() {
  try {
    currentUser = await api.get('/auth/me');
    if (profileNameInput) profileNameInput.value = currentUser.name || '';
    if (profileEmailInput) profileEmailInput.value = currentUser.email || '';
    if (profilePhoneInput) profilePhoneInput.value = currentUser.phone || '';

    const nameEl = document.getElementById('customer-name-display');
    const emailEl = document.getElementById('customer-email-display');
    if (nameEl) nameEl.textContent = currentUser.name || 'Customer';
    if (emailEl) emailEl.textContent = currentUser.email || '';
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
    setCurrentUser(updated);
    const nameEl = document.getElementById('customer-name-display');
    if (nameEl) nameEl.textContent = updated.name;
    showToast('Profile updated successfully', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update profile', 'danger');
  }
});

passwordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwd = newPasswordInput.value;
  const confirmPwd = confirmPasswordInput.value;

  if (pwd !== confirmPwd) {
    showToast('Passwords do not match', 'warning');
    return;
  }

  const check = validatePassword(pwd);
  if (!check.valid) {
    showToast('Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters', 'warning');
    return;
  }

  try {
    await api.post('/auth/change-password', {
      current_password: document.getElementById('current-password')?.value || '',
      new_password: pwd
    });
    showToast('Password updated successfully', 'success');
    passwordForm.reset();
  } catch (err) {
    showToast(err.message || 'Failed to update password', 'danger');
  }
});

loadProfile();
