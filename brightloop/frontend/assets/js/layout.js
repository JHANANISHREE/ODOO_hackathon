import { getCurrentUser } from '/assets/js/api.js';
import { logoutUser } from '/assets/js/auth.js';

const NAV_ITEMS = [
  { section: 'NAVIGATION' },
  { key: 'dashboard', label: 'Overview', href: '/admin/dashboard.html', icon: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>' },
  { key: 'subscriptions', label: 'Subscriptions', href: '/admin/subscriptions.html', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' },
  { key: 'products', label: 'Products & Variants', href: '/admin/products.html', icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>' },
  { key: 'plans', label: 'Billing Plans', href: '/admin/plans.html', icon: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>' },
  { key: 'templates', label: 'Templates', href: '/admin/templates.html', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>' },
  { key: 'taxes', label: 'Taxes', href: '/admin/taxes.html', icon: '<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>' },
  { key: 'discounts', label: 'Discounts', href: '/admin/discounts.html', icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>' },
  { key: 'invoices', label: 'Invoices', href: '/admin/invoices.html', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line>' },
  { key: 'payments', label: 'Payments', href: '/admin/payments.html', icon: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>' },
  { section: 'DIRECTORY' },
  { key: 'customers', label: 'Customers', href: '/admin/customers.html', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' },
  { key: 'settings', label: 'Settings', href: '/admin/settings.html', icon: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' }
];

export function getActiveKeyFromUrl() {
  const path = window.location.pathname.toLowerCase();
  for (const item of NAV_ITEMS) {
    if (item.href && path.includes(item.key)) {
      return item.key;
    }
  }
  return 'dashboard';
}

export function initLayout(options = {}) {
  const activeKey = options.activeKey || getActiveKeyFromUrl();
  const pageTitle = options.pageTitle || document.title.split('|')[0].trim();
  const breadcrumb = options.breadcrumb || `Admin / ${pageTitle}`;

  let sidebar = document.querySelector('.app-sidebar, #app-sidebar');
  if (sidebar) {
    renderSidebar(sidebar, activeKey);
  }

  let topbar = document.querySelector('.app-topbar, header.app-topbar');
  if (topbar) {
    renderTopbar(topbar, pageTitle, breadcrumb);
  }

  setupMobileDrawer();
  setupUserDisplay();
}

function renderSidebar(sidebar, activeKey) {
  let navHtml = '';
  for (const item of NAV_ITEMS) {
    if (item.section) {
      navHtml += `<div class="nav-section-title">${item.section}</div>`;
    } else {
      const isActive = item.key === activeKey ? 'active' : '';
      navHtml += `
        <a href="${item.href}" class="nav-link ${isActive}" data-nav="${item.key}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="icon">${item.icon}</svg>
          <span>${item.label}</span>
        </a>
      `;
    }
  }

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon">B</div>
      <div class="brand-name">Brightloop</div>
    </div>
    <nav class="sidebar-nav">
      ${navHtml}
    </nav>
    <div class="sidebar-user">
      <div class="user-profile-badge">
        <div class="user-avatar" id="current-user-avatar">AD</div>
        <div class="user-meta">
          <div class="user-name" id="current-user-name">Administrator</div>
          <div class="user-role" id="current-user-role">ADMIN</div>
        </div>
      </div>
      <button class="sidebar-logout-btn" id="sidebar-logout-btn" title="Log out" aria-label="Log out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>
  `;

  const logoutBtn = sidebar.querySelector('#sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => logoutUser());
  }
}

function renderTopbar(topbar, pageTitle, breadcrumb) {
  topbar.innerHTML = `
    <div class="topbar-left">
      <button class="menu-toggle" id="menu-toggle" aria-label="Toggle Navigation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <div class="topbar-title-group">
        <span class="topbar-breadcrumb">${breadcrumb}</span>
        <h1 class="topbar-title">${pageTitle}</h1>
      </div>
    </div>
    <div class="topbar-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" id="global-search" placeholder="Search subscriptions, customers, invoices...">
    </div>
    <div class="topbar-actions">
      <div class="latency-badge" id="latency-badge">⚡ 0ms</div>
      <button class="topbar-bell-btn" id="topbar-notifications" title="Notifications" aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </button>
      <button class="btn btn-secondary btn-sm" id="logout-btn">Log out</button>
    </div>
  `;

  const logoutBtn = topbar.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => logoutUser());
  }
}

function setupMobileDrawer() {
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.app-sidebar, #app-sidebar');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('active');
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    });
  }
}

export function setupUserDisplay() {
  const user = getCurrentUser();
  if (!user) return;

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
  const nameEls = document.querySelectorAll('#current-user-name, .user-name');
  const roleEls = document.querySelectorAll('#current-user-role, .user-role');
  const avatarEls = document.querySelectorAll('#current-user-avatar, .user-avatar');

  nameEls.forEach(el => { el.textContent = user.name || user.email; });
  roleEls.forEach(el => { el.textContent = user.role || 'USER'; });
  avatarEls.forEach(el => { el.textContent = initials; });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.app-layout, .app')) {
    initLayout();
  }
});
