import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, formatCurrency, formatDate } from '/assets/js/ui.js';

requireRole(['CUSTOMER', 'ADMIN', 'STAFF']);

const userStr = localStorage.getItem('user');
if (userStr) {
  try {
    const u = JSON.parse(userStr);
    document.getElementById('customer-name-display').textContent = u.name || 'Customer';
    document.getElementById('customer-email-display').textContent = u.email || '';
  } catch (_) {}
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

let activeSubId = null;

async function loadPortalData() {
  try {
    const overview = await api.get('/api/portal/overview');

    if (overview.customer) {
      document.getElementById('customer-name-display').textContent = overview.customer.name;
      document.getElementById('customer-email-display').textContent = overview.customer.email;
    }

    const hero = overview.active_subscription;
    const banner = document.getElementById('active-subscription-banner');
    const heroActions = document.getElementById('hero-actions');

    if (hero) {
      activeSubId = hero.id;
      banner.style.display = 'block';
      document.getElementById('hero-plan-name').textContent = hero.plan_name;
      document.getElementById('hero-sub-number').textContent = hero.subscription_number;
      document.getElementById('hero-price').textContent = formatCurrency(hero.recurring_total);
      document.getElementById('hero-cycle').textContent = `per ${hero.billing_interval}`;
      document.getElementById('hero-start-date').textContent = formatDate(hero.start_date);
      document.getElementById('hero-next-billing').textContent = hero.next_billing_date ? formatDate(hero.next_billing_date) : 'End of period';
      document.getElementById('hero-total-spent').textContent = formatCurrency(overview.total_spent || 0);
      document.getElementById('hero-outstanding').textContent = formatCurrency(overview.outstanding_balance || 0);

      const badge = document.getElementById('hero-badge');
      if (hero.status === 'PAUSED') {
        badge.className = 'badge badge-warning';
        badge.textContent = 'PAUSED SUBSCRIPTION';
        heroActions.innerHTML = `
          <button class="btn btn-primary btn-sm" id="resume-sub-btn">Resume Subscription</button>
          <button class="btn btn-danger btn-sm" id="cancel-sub-btn">Cancel Subscription</button>
        `;
      } else {
        badge.className = 'badge badge-success';
        badge.textContent = 'ACTIVE SUBSCRIPTION';
        heroActions.innerHTML = `
          <button class="btn btn-secondary btn-sm" id="pause-sub-btn">Pause Subscription</button>
          <button class="btn btn-danger btn-sm" id="cancel-sub-btn">Cancel Subscription</button>
        `;
      }

      document.getElementById('pause-sub-btn')?.addEventListener('click', () => handleStateTransition('pause'));
      document.getElementById('resume-sub-btn')?.addEventListener('click', () => handleStateTransition('resume'));
      document.getElementById('cancel-sub-btn')?.addEventListener('click', () => handleStateTransition('cancel'));
    } else {
      banner.style.display = 'none';
    }

    const subs = await api.get('/api/portal/subscriptions');
    renderSubscriptionsTable(subs);
  } catch (err) {
    showToast(err.message || 'Failed to load subscription portal', 'danger');
  }
}

async function handleStateTransition(action) {
  if (!activeSubId) return;

  const confirmMsg = action === 'cancel'
    ? 'Are you sure you want to cancel your subscription? Access will end at the end of the current period.'
    : `Are you sure you want to ${action} your subscription?`;

  if (!confirm(confirmMsg)) return;

  try {
    await api.post(`/api/portal/subscriptions/${activeSubId}/${action}`);
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
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: var(--space-8);">No subscriptions on record.</td></tr>`;
    return;
  }

  const badgeMap = {
    ACTIVE: 'badge-success',
    PENDING: 'badge-warning',
    PAUSED: 'badge-muted',
    EXPIRED: 'badge-danger',
    CANCELLED: 'badge-danger'
  };

  tbody.innerHTML = list.map(s => {
    return `
      <tr>
        <td style="font-family: monospace; font-weight: var(--font-semibold); color: var(--color-primary);">${s.subscription_number}</td>
        <td style="font-weight: var(--font-medium);">${s.plan ? s.plan.name : 'Subscription Plan'}</td>
        <td style="font-weight: var(--font-semibold);">${formatCurrency(s.recurring_total)}</td>
        <td><span class="badge ${badgeMap[s.status] || 'badge-muted'}">${s.status}</span></td>
        <td class="text-muted text-sm">${s.next_billing_date ? formatDate(s.next_billing_date) : 'N/A'}</td>
        <td class="text-muted text-sm">${formatDate(s.start_date)}</td>
        <td style="text-align: right;">
          <a href="/portal/my-invoices.html" class="btn btn-secondary btn-sm">Invoices</a>
        </td>
      </tr>
    `;
  }).join('');
}

loadPortalData();
