export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function checkPasswordRules(password) {
  const p = password || '';
  return {
    minLength: p.length > 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasSpecial: /[^a-zA-Z0-9]/.test(p)
  };
}

export function isPasswordValid(password) {
  const rules = checkPasswordRules(password);
  return rules.minLength && rules.hasUpper && rules.hasLower && rules.hasSpecial;
}

export function updatePasswordChecklistUI(password, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rules = checkPasswordRules(password);

  const lenEl = container.querySelector('[data-rule="length"]');
  const upperEl = container.querySelector('[data-rule="upper"]');
  const lowerEl = container.querySelector('[data-rule="lower"]');
  const specialEl = container.querySelector('[data-rule="special"]');

  if (lenEl) lenEl.classList.toggle('valid', rules.minLength);
  if (upperEl) upperEl.classList.toggle('valid', rules.hasUpper);
  if (lowerEl) lowerEl.classList.toggle('valid', rules.hasLower);
  if (specialEl) specialEl.classList.toggle('valid', rules.hasSpecial);

  return rules.minLength && rules.hasUpper && rules.hasLower && rules.hasSpecial;
}

export function setFieldError(inputEl, errorEl, message) {
  if (inputEl) inputEl.classList.add('is-invalid');
  if (errorEl) errorEl.textContent = message || '';
}

export function clearFieldError(inputEl, errorEl) {
  if (inputEl) inputEl.classList.remove('is-invalid');
  if (errorEl) errorEl.textContent = '';
}
