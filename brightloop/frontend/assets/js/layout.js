import { getCurrentUser } from '/assets/js/api.js';
import { logoutUser } from '/assets/js/auth.js';

const ADMIN_NAV_ITEMS = [
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
  for (const item of ADMIN_NAV_ITEMS) {
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
  for (const item of ADMIN_NAV_ITEMS) {
    if (item.section) {
      navHtml += `<div class="nav-section-title">${item.section}</div>`;
    } else {
      const isActive = item.key === activeKey ? 'active' : '';
      navHtml += `
        <a href="${item.href}" class="nav-link ${isActive}" data-nav="${item.key}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="icon icon-20">${item.icon}</svg>
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon icon-20"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon icon-20"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <div class="topbar-title-group">
        <span class="topbar-breadcrumb">${breadcrumb}</span>
        <h1 class="topbar-title">${pageTitle}</h1>
      </div>
    </div>
    <div class="topbar-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon icon-16"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" id="global-search" placeholder="Search subscriptions, customers, invoices..." aria-label="Global search">
    </div>
    <div class="topbar-actions">
      <div class="latency-badge" id="latency-badge">⚡ 0ms</div>
      <button class="topbar-bell-btn" id="topbar-notifications" title="Notifications" aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon icon-20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
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
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.app-sidebar, #app-sidebar');
  let backdrop = document.querySelector('.sidebar-backdrop');

  if (!backdrop && sidebar) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  function toggleSidebar(open) {
    if (!sidebar) return;
    const shouldOpen = open !== undefined ? open : !sidebar.classList.contains('open');
    if (shouldOpen) {
      sidebar.classList.add('open');
      backdrop?.classList.add('active');
    } else {
      sidebar.classList.remove('open');
      backdrop?.classList.remove('active');
    }
  }

  menuToggle?.addEventListener('click', () => toggleSidebar());
  backdrop?.addEventListener('click', () => toggleSidebar(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar?.classList.contains('open')) {
      toggleSidebar(false);
    }
  });
}

function setupUserDisplay() {
  const user = getCurrentUser();
  if (!user) return;

  const nameEls = document.querySelectorAll('#current-user-name, [data-user-name]');
  nameEls.forEach(el => el.textContent = user.name || 'User');

  const roleEls = document.querySelectorAll('#current-user-role, [data-user-role]');
  roleEls.forEach(el => el.textContent = user.role || '');

  const avatarEls = document.querySelectorAll('#current-user-avatar, [data-user-avatar]');
  const initials = (user.name || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  avatarEls.forEach(el => el.textContent = initials);
}

export function initPortalLayout(options = {}) {
  const path = window.location.pathname.toLowerCase();
  let activeTab = 'subscriptions';
  if (path.includes('invoice')) activeTab = 'invoices';
  if (path.includes('profile')) activeTab = 'profile';

  const user = getCurrentUser() || {};
  const initials = (user.name || 'Customer').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  let header = document.querySelector('header.portal-header, header');
  if (header) {
    header.className = 'portal-header';
    header.innerHTML = `
      <div class="container portal-header-inner">
        <div class="portal-brand-group">
          <a href="/portal/my-subscriptions.html" class="portal-brand-link">
            <div class="brand-icon">B</div>
            <span class="brand-name portal-brand-name">Brightloop</span>
          </a>
          <span class="portal-badge">CUSTOMER PORTAL</span>
        </div>

        <nav class="portal-nav" id="portal-nav">
          <a href="/portal/my-subscriptions.html" class="portal-tab ${activeTab === 'subscriptions' ? 'active' : ''}">Subscriptions</a>
          <a href="/portal/my-invoices.html" class="portal-tab ${activeTab === 'invoices' ? 'active' : ''}">Invoices &amp; Receipts</a>
          <a href="/portal/profile.html" class="portal-tab ${activeTab === 'profile' ? 'active' : ''}">Account Profile</a>
        </nav>

        <div class="portal-user-group">
          <div class="portal-user-avatar">${initials}</div>
          <div class="portal-user-meta">
            <div class="portal-user-name" id="customer-name-display">${user.name || 'Customer'}</div>
            <div class="portal-user-email" id="customer-email-display">${user.email || 'customer@brightloop.com'}</div>
          </div>
          <button class="btn btn-secondary btn-sm" id="logout-btn">Log out</button>
        </div>

        <button class="portal-mobile-toggle" id="portal-mobile-toggle" aria-label="Toggle navigation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon icon-20"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>

      <div class="portal-mobile-drawer" id="portal-mobile-drawer">
        <div class="portal-drawer-inner">
          <div class="portal-drawer-user">
            <div class="portal-user-avatar">${initials}</div>
            <div>
              <div class="font-bold">${user.name || 'Customer'}</div>
              <div class="text-xs text-muted">${user.email || ''}</div>
            </div>
          </div>
          <nav class="portal-drawer-links">
            <a href="/portal/my-subscriptions.html" class="portal-tab ${activeTab === 'subscriptions' ? 'active' : ''}">Subscriptions</a>
            <a href="/portal/my-invoices.html" class="portal-tab ${activeTab === 'invoices' ? 'active' : ''}">Invoices &amp; Receipts</a>
            <a href="/portal/profile.html" class="portal-tab ${activeTab === 'profile' ? 'active' : ''}">Account Profile</a>
          </nav>
          <div style="margin-top: 1rem;">
            <button class="btn btn-secondary btn-sm" style="width: 100%;" id="drawer-logout-btn">Log out</button>
          </div>
        </div>
      </div>
    `;

    const toggleBtn = header.querySelector('#portal-mobile-toggle');
    const drawer = header.querySelector('#portal-mobile-drawer');
    toggleBtn?.addEventListener('click', () => {
      drawer?.classList.toggle('open');
    });

    header.querySelector('#logout-btn')?.addEventListener('click', () => logoutUser());
    header.querySelector('#drawer-logout-btn')?.addEventListener('click', () => logoutUser());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer?.classList.contains('open')) {
        drawer.classList.remove('open');
      }
    });
  }
}

export function initPublicNavbar(options = {}) {
  const isHome = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
  const nav = document.querySelector('nav.public-nav, nav');
  if (!nav) return;

  const prefix = isHome ? '' : '/';

  nav.className = 'public-nav';
  nav.innerHTML = `
    <div class="container public-nav-inner">
      <a href="/" class="public-brand-link">
        <div class="brand-icon">B</div>
        <span class="brand-name" style="color: var(--maroon-900); font-family: var(--font-display); font-size: 1.45rem; font-weight: 700;">Brightloop</span>
      </a>

      <ul class="public-nav-links" id="public-nav-links">
        <li><a href="${prefix}#features" class="public-nav-item">Features</a></li>
        <li><a href="${prefix}#how-it-works" class="public-nav-item">How It Works</a></li>
        <li><a href="${prefix}#pricing" class="public-nav-item">Pricing</a></li>
        <li><a href="${prefix}#faq" class="public-nav-item">FAQ</a></li>
      </ul>

      <div class="public-nav-actions">
        <a href="/login.html" class="btn btn-secondary btn-sm">Sign In</a>
        <a href="/signup.html" class="btn btn-primary btn-sm">Get Started</a>
      </div>

      <button class="mobile-menu-btn" id="mobile-toggle-btn" aria-label="Toggle navigation">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon icon-24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
    </div>

    <div class="public-mobile-drawer" id="public-mobile-drawer">
      <div class="public-drawer-links">
        <a href="${prefix}#features" class="public-drawer-item">Features</a>
        <a href="${prefix}#how-it-works" class="public-drawer-item">How It Works</a>
        <a href="${prefix}#pricing" class="public-drawer-item">Pricing</a>
        <a href="${prefix}#faq" class="public-drawer-item">FAQ</a>
        <div class="public-drawer-buttons">
          <a href="/login.html" class="btn btn-secondary" style="width: 100%;">Sign In</a>
          <a href="/signup.html" class="btn btn-primary" style="width: 100%;">Get Started</a>
        </div>
      </div>
    </div>
  `;

  const toggleBtn = nav.querySelector('#mobile-toggle-btn');
  const drawer = nav.querySelector('#public-mobile-drawer');

  toggleBtn?.addEventListener('click', () => {
    drawer?.classList.toggle('open');
  });

  drawer?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) {
      drawer.classList.remove('open');
    }
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// Auto-initialize shared layout components when DOM is ready
function autoInitLayout() {
  if (document.querySelector('.app-sidebar') || document.querySelector('.app-topbar')) {
    initLayout();
  }
  if (document.querySelector('.portal-header') && !document.querySelector('.portal-header-inner')) {
    initPortalLayout();
  }
  if (document.querySelector('nav.public-nav') && !document.querySelector('.public-nav-inner')) {
    initPublicNavbar();
  }

  // Update initial latency badge if present
  const badge = document.getElementById('latency-badge');
  if (badge && (badge.textContent.includes('0ms') || !badge.textContent.trim())) {
    try {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry && navEntry.responseEnd) {
        const dur = Math.round(navEntry.responseEnd - (navEntry.requestStart || 0));
        if (dur > 0 && dur < 10000) {
          badge.textContent = `⚡ ${dur}ms`;
        }
      }
    } catch (_) {}
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitLayout);
  } else {
    autoInitLayout();
  }
}

