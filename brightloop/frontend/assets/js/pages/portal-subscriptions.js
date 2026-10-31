import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, formatCurrency, formatDate } from '/assets/js/ui.js';
import { initPortalLayout } from '/assets/js/layout.js';

requireRole(['CUSTOMER', 'ADMIN', 'STAFF']);
initPortalLayout();

let activeSubId = null;

function formatInterval(interval) {
  if (!interval) return 'month';
  const clean = String(interval).toLowerCase().trim();
  const map = {
    daily: 'day', day: 'day',
    weekly: 'week', week: 'week',
    monthly: 'month', month: 'month',
    yearly: 'year', year: 'year'
  };
  return map[clean] || clean;
}

async function loadPortalData() {
  try {
    const overview = await api.get('/portal/overview');

    if (overview.customer) {
      const nameEl = document.getElementById('customer-name-display');
      const emailEl = document.getElementById('customer-email-display');
      if (nameEl) nameEl.textContent = overview.customer.name;
      if (emailEl) emailEl.textContent = overview.customer.email;
    }

    const hero = overview.active_subscription;
    const banner = document.getElementById('active-subscription-banner');
    const heroActions = document.getElementById('hero-actions');

    if (hero) {
      activeSubId = hero.id;
      if (banner) banner.style.display = 'block';
      const planNameEl = document.getElementById('hero-plan-name');
      const subNumEl = document.getElementById('hero-sub-number');
      const priceEl = document.getElementById('hero-price');
      const cycleEl = document.getElementById('hero-cycle');
      const startEl = document.getElementById('hero-start-date');
      const nextEl = document.getElementById('hero-next-billing');
      const totalSpentEl = document.getElementById('hero-total-spent');
      const outBalEl = document.getElementById('hero-outstanding');

      if (planNameEl) planNameEl.textContent = hero.plan_name;
      if (subNumEl) subNumEl.textContent = hero.subscription_number;
      if (priceEl) priceEl.textContent = formatCurrency(hero.recurring_total);
      if (cycleEl) cycleEl.textContent = `per ${formatInterval(hero.billing_interval)}`;
      if (startEl) startEl.textContent = formatDate(hero.start_date);
      if (nextEl) nextEl.textContent = hero.next_billing_date ? formatDate(hero.next_billing_date) : 'N/A';
      if (totalSpentEl) totalSpentEl.textContent = formatCurrency(overview.lifetime_invoiced || 0);
      if (outBalEl) outBalEl.textContent = formatCurrency(overview.outstanding_balance || 0);

      const badge = document.getElementById('hero-badge');
      if (badge) {
        const isPaused = hero.status.toUpperCase() === 'PAUSED' || hero.is_paused;
        if (isPaused) {
          badge.className = 'badge badge-warning';
          badge.textContent = 'PAUSED SUBSCRIPTION';
          if (heroActions) {
            heroActions.innerHTML = `
              <button class="btn btn-primary btn-sm" id="resume-sub-btn">Resume Subscription</button>
            `;
          }
        } else {
          badge.className = 'badge badge-success';
          badge.textContent = 'ACTIVE SUBSCRIPTION';
          if (heroActions) {
            heroActions.innerHTML = `
              <button class="btn btn-secondary btn-sm" id="pause-sub-btn">Pause Subscription</button>
            `;
          }
        }
      }

      document.getElementById('pause-sub-btn')?.addEventListener('click', () => handleStateTransition('pause'));
      document.getElementById('resume-sub-btn')?.addEventListener('click', () => handleStateTransition('resume'));
    } else {
      if (banner) banner.style.display = 'none';
    }

    const subs = await api.get('/portal/subscriptions');
    renderSubscriptionsTable(subs);
  } catch (err) {
    showToast(err.message || 'Failed to load subscription portal', 'danger');
  }
}

async function handleStateTransition(action) {
  if (!activeSubId) return;

  const confirmMsg = `Are you sure you want to ${action} this subscription?`;
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
        <td colspan="7" class="text-center" style="padding: 3.5rem 1.5rem;" id="portal-empty-state">
          <div style="max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--cream-100); display: flex; align-items: center; justify-content: center; color: var(--maroon-700);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--maroon-900); margin: 0;">No active subscriptions found</h3>
            <p class="text-muted text-sm" style="margin: 0; line-height: 1.5;">You currently do not have any enrolled subscriptions. Contact your account manager or explore our plans.</p>
            <a href="/#pricing" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">Explore Plans</a>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const badgeMap = {
    DRAFT: 'badge-draft',
    QUOTATION: 'badge-quotation',
    CONFIRMED: 'badge-confirmed',
    ACTIVE: 'badge-active',
    PAUSED: 'badge-paused',
    CLOSED: 'badge-closed',
    CANCELLED: 'badge-cancelled'
  };

  tbody.innerHTML = list.map(s => {
    const stUpper = (s.status || '').toUpperCase();
    const badgeClass = badgeMap[stUpper] || 'badge-muted';
    const recTot = formatCurrency(s.recurring_total || s.total_amount || 0);

    return `
      <tr>
        <td class="font-mono text-sm" style="font-weight: 600; color: var(--maroon-900);">${s.subscription_number}</td>
        <td style="font-weight: 500;">${s.plan ? s.plan.name : 'Subscription Plan'}</td>
        <td class="text-right" style="font-weight: 600;">${recTot}</td>
        <td><span class="badge ${badgeClass}"><span class="badge-dot"></span>${stUpper}</span></td>
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
