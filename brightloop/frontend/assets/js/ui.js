export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : type === 'error'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <span style="flex:1;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function openModal(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;
  modal.classList.add('open');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

export function closeModal(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;
  modal.classList.remove('open');
  modal.style.display = 'none';
  if (!document.querySelector('.modal.open, .modal-backdrop.open')) {
    document.body.style.overflow = '';
  }
}

document.addEventListener('click', (e) => {
  const openTrigger = e.target.closest('[data-open-modal]');
  if (openTrigger) {
    const target = openTrigger.getAttribute('data-open-modal');
    openModal(target);
  }
  const closeTrigger = e.target.closest('[data-close-modal]');
  if (closeTrigger) {
    const target = closeTrigger.getAttribute('data-close-modal');
    closeModal(target);
  }
  if (e.target.classList.contains('modal') && e.target.classList.contains('open')) {
    closeModal(e.target);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.modal.open, [id$="-modal"].open');
    openModals.forEach(m => closeModal(m));
  }
});

export function formatCurrency(amount, currency = '$') {
  const num = Number(amount) || 0;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function countUp(element, endVal, prefix = '', suffix = '', duration = 1200) {
  if (!element) return;
  const start = 0;
  const startTime = performance.now();
  const numericEnd = parseFloat(String(endVal).replace(/[^0-9.-]+/g, '')) || 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutQuad = progress * (2 - progress);
    const currentVal = Math.floor(start + (numericEnd - start) * easeOutQuad);

    element.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = `${prefix}${endVal}${suffix}`;
    }
  }

  requestAnimationFrame(update);
}


if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const logoutTarget = e.target.closest('#logout-btn, #admin-logout-btn, .logout-btn, [data-action="logout"]');
    if (logoutTarget) {
      e.preventDefault();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login.html';
    }
  });
}
