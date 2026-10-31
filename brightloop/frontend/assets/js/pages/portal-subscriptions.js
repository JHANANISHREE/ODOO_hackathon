import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, formatCurrency, formatDate } from '/assets/js/ui.js';

requireRole(['CUSTOMER', 'ADMIN', 'STAFF']);

const userStr = localStorage.getItem('bl_user') || localStorage.getItem('user');
if (userStr) {
  try {
    const u = JSON.parse(userStr);
    const nameEl = document.getElementById('customer-name-display');
    const emailEl = document.getElementById('customer-email-display');
    if (nameEl && u.name) nameEl.textContent = u.name;
    if (emailEl && u.email) emailEl.textContent = u.email;
  } catch (_) {}
}

let activeSubId = null;

async function loadPortalData() {
  const banner = document.getElementById('active-subscription-banner');
  const noBanner = document.getElementById('no-active-sub-banner');
  const heroActions = document.getElementById('hero-actions');

  try {
    const overview = await api.get('/portal/overview');

    if (overview && overview.customer) {
      const nameEl = document.getElementById('customer-name-display');
      const emailEl = document.getElementById('customer-email-display');
      if (nameEl) nameEl.textContent = overview.customer.name;
      if (emailEl) emailEl.textContent = overview.customer.email;
    }

    const hero = overview ? overview.active_subscription : null;

    if (hero) {
      activeSubId = hero.id;
      if (banner) banner.style.display = 'block';
      if (noBanner) noBanner.style.display = 'none';

      document.getElementById('hero-plan-name').textContent = hero.plan_name || 'Active Plan';
      document.getElementById('hero-sub-number').textContent = hero.subscription_number || 'SUB-0000';
      document.getElementById('hero-price').textContent = formatCurrency(hero.recurring_total || 0);
      document.getElementById('hero-cycle').textContent = `per ${hero.billing_interval || 'month'}`;
      document.getElementById('hero-start-date').textContent = formatDate(hero.start_date);
      document.getElementById('hero-next-billing').textContent = hero.next_billing_date ? formatDate(hero.next_billing_date) : 'End of period';
      document.getElementById('hero-total-spent').textContent = formatCurrency(overview.total_spent || 0);
      document.getElementById('hero-outstanding').textContent = formatCurrency(overview.outstanding_balance || 0);

      const badge = document.getElementById('hero-badge');
      if (hero.status === 'PAUSED' || hero.is_paused) {
        if (badge) {
          badge.className = 'badge badge-warning';
          badge.textContent = 'PAUSED SUBSCRIPTION';
        }
        if (heroActions) {
          heroActions.innerHTML = `
            <button class="btn btn-primary btn-sm" id="resume-sub-btn">Resume Subscription</button>
            <button class="btn btn-danger btn-sm" id="cancel-sub-btn">Cancel Subscription</button>
          `;
        }
      } else {
        if (badge) {
          badge.className = 'badge badge-success';
          badge.textContent = 'ACTIVE SUBSCRIPTION';
        }
        if (heroActions) {
          heroActions.innerHTML = `
            <button class="btn btn-secondary btn-sm" id="pause-sub-btn">Pause Subscription</button>
            <button class="btn btn-danger btn-sm" id="cancel-sub-btn">Cancel Subscription</button>
          `;
        }
      }

      document.getElementById('pause-sub-btn')?.addEventListener('click', () => handleStateTransition('pause'));
      document.getElementById('resume-sub-btn')?.addEventListener('click', () => handleStateTransition('resume'));
      document.getElementById('cancel-sub-btn')?.addEventListener('click', () => handleStateTransition('cancel'));
    } else {
      if (banner) banner.style.display = 'none';
      if (noBanner) noBanner.style.display = 'block';
    }

    const subs = await api.get('/portal/subscriptions');
    renderSubscriptionsTable(subs);
  } catch (err) {
    console.error('Portal load error:', err);
    if (banner) banner.style.display = 'none';
    if (noBanner) noBanner.style.display = 'block';
    renderSubscriptionsTable([]);
  }
}

async function handleStateTransition(action) {
  if (!activeSubId) return;

  const confirmMsg = action === 'cancel'
    ? 'Are you sure you want to cancel your subscription? Access will end at the end of the current period.'
    : `Are you sure you want to ${action} your subscription?`;

  if (!confirm(confirmMsg)) return;

  try {
    await api.post(`/portal/subscriptions/${activeSubId}/${action}`);
    showToast(`Subscription ${action}d successfully`, 'success');
    loadPortalData();
  } catch (err) {
    showToast(err.message || `Failed to ${action} subscription`, 'danger');
  }
}

function renderSubscriptionsTable(list) {
  const tbody = document.getElementById('portal-subs-tbody');
  if (!tbody) return;

  if (!list || !list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 3.5rem 1.5rem; text-align: center;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #f9fafb; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            </div>
            <div style="font-size: 1.05rem; font-weight: 600; color: #1f2937;">No Subscriptions Found</div>
            <div style="font-size: 0.875rem; color: #6b7280; max-width: 400px;">There are no subscriptions enrolled under your account.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const badgeMap = {
    ACTIVE: 'badge-success',
    active: 'badge-success',
    DRAFT: 'badge-muted',
    draft: 'badge-muted',
    QUOTATION: 'badge-warning',
    quotation: 'badge-warning',
    CONFIRMED: 'badge-primary',
    confirmed: 'badge-primary',
    PENDING: 'badge-warning',
    pending: 'badge-warning',
    PAUSED: 'badge-warning',
    paused: 'badge-warning',
    EXPIRED: 'badge-danger',
    expired: 'badge-danger',
    CLOSED: 'badge-danger',
    closed: 'badge-danger',
    CANCELLED: 'badge-danger',
    cancelled: 'badge-danger'
  };

  tbody.innerHTML = list.map(s => {
    const statusUpper = (s.status || '').toUpperCase();
    return `
      <tr>
        <td style="font-family: monospace; font-weight: 600; color: #800020;">${s.subscription_number || 'SUB-XXXX'}</td>
        <td style="font-weight: 500;">${s.plan ? s.plan.name : 'Subscription Plan'}</td>
        <td style="font-weight: 600;">${formatCurrency(s.recurring_total || s.total_amount || 0)}</td>
        <td><span class="badge ${badgeMap[s.status] || 'badge-muted'}">${statusUpper}</span></td>
        <td class="text-muted text-sm">${s.next_billing_date ? formatDate(s.next_billing_date) : (s.expiry_date ? formatDate(s.expiry_date) : 'N/A')}</td>
        <td class="text-muted text-sm">${formatDate(s.start_date)}</td>
        <td style="text-align: right;">
          <a href="/portal/my-invoices.html" class="btn btn-secondary btn-sm">Invoices</a>
        </td>
      </tr>
    `;
  }).join('');
}

loadPortalData();
