import { api } from '../api.js';
import { formatCurrency } from '../ui.js';
import { initPublicNavbar } from '../layout.js';

let plansData = [];
let billingMode = 'monthly';

function renderSkeletons() {
  const mrrEl = document.getElementById('preview-mrr');
  const subsEl = document.getElementById('preview-subs');
  const rateEl = document.getElementById('preview-rate');
  const tbody = document.getElementById('preview-recent-tbody');

  if (mrrEl) mrrEl.innerHTML = '<span class="skeleton" style="display:inline-block; width:120px; height:32px; border-radius:6px;"></span>';
  if (subsEl) subsEl.innerHTML = '<span class="skeleton" style="display:inline-block; width:80px; height:32px; border-radius:6px;"></span>';
  if (rateEl) rateEl.innerHTML = '<span class="skeleton" style="display:inline-block; width:60px; height:32px; border-radius:6px;"></span>';
  if (tbody) {
    tbody.innerHTML = `
      <tr><td colspan="5" style="padding: 1.5rem; text-align: center;"><div class="skeleton" style="width: 100%; height: 24px; border-radius: 6px; margin-bottom: 8px;"></div><div class="skeleton" style="width: 80%; height: 24px; border-radius: 6px;"></div></td></tr>
    `;
  }
}

async function loadLiveStats() {
  renderSkeletons();
  try {
    const stats = await api.get('/public/stats');

    const mrrEl = document.getElementById('preview-mrr');
    const subsEl = document.getElementById('preview-subs');
    const rateEl = document.getElementById('preview-rate');
    const tbody = document.getElementById('preview-recent-tbody');

    const statSubs = document.getElementById('stat-subscriptions');
    const statInvoices = document.getElementById('stat-invoices');
    const statUptime = document.getElementById('stat-uptime');
    const statSpeed = document.getElementById('stat-speed');

    if (mrrEl) mrrEl.textContent = formatCurrency(stats.mrr || 0);
    if (subsEl) subsEl.textContent = Number(stats.active_subscriptions || 0).toLocaleString();
    if (rateEl) rateEl.textContent = stats.invoicing_rate || '100%';

    if (statSubs) statSubs.textContent = `${Number(stats.active_subscriptions || 0).toLocaleString()}+`;
    if (statInvoices) statInvoices.textContent = stats.mrr ? formatCurrency(stats.mrr * 12) : '$8.4M+';
    if (statUptime) statUptime.textContent = stats.uptime || '99.99%';
    if (statSpeed) statSpeed.textContent = stats.processing_time || '< 0.05s';

    if (tbody && stats.recent_subscriptions && stats.recent_subscriptions.length) {
      const badgeMap = {
        active: 'badge-active',
        confirmed: 'badge-confirmed',
        quotation: 'badge-quotation',
        draft: 'badge-draft',
        paused: 'badge-paused',
        closed: 'badge-closed'
      };

      tbody.innerHTML = stats.recent_subscriptions.map(s => {
        const stLower = (s.status || '').toLowerCase();
        const badgeClass = badgeMap[stLower] || 'badge-muted';
        return `
          <tr>
            <td class="font-mono text-sm" style="font-weight: 600; color: var(--maroon-900);">${s.number}</td>
            <td style="font-weight: 500;">${s.customer}</td>
            <td class="text-muted text-sm">${s.plan}</td>
            <td><span class="badge ${badgeClass}"><span class="badge-dot"></span>${s.status.toUpperCase()}</span></td>
            <td class="text-right" style="font-weight: 600;">${formatCurrency(s.amount)}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load public stats:', err);
  }
}

async function loadPlans() {
  const container = document.getElementById('pricing-grid');
  if (!container) return;

  try {
    plansData = await api.get('/public/plans');
    renderPlans();
  } catch (err) {
    console.error('Failed to load plans:', err);
  }
}

function renderPlans() {
  const container = document.getElementById('pricing-grid');
  if (!container || !plansData.length) return;

  container.innerHTML = plansData.map(plan => {
    const price = billingMode === 'monthly' ? plan.price_monthly : plan.price_yearly;
    const periodText = billingMode === 'monthly' ? '/ month' : '/ year';
    const isPopular = plan.popular;

    return `
      <div class="pricing-card ${isPopular ? 'featured' : ''}" style="position: relative; background: var(--card-bg); border: ${isPopular ? '2px solid var(--maroon-800)' : '1px solid var(--border)'}; border-radius: var(--radius-card); padding: 32px 28px; box-shadow: ${isPopular ? 'var(--shadow-md)' : 'var(--shadow-sm)'}; display: flex; flex-direction: column;">
        ${isPopular ? '<div style="position: absolute; top: -14px; right: 24px;" class="badge badge-active">Most Popular</div>' : ''}
        <h3 style="font-family: var(--font-body); font-size: 1.35rem; font-weight: 700; color: var(--maroon-900); margin-bottom: 0.5rem;">${plan.name}</h3>
        <p class="text-muted text-sm" style="min-height: 44px; margin-bottom: 1.5rem;">${plan.description}</p>
        <div style="margin-bottom: 1.5rem; display: flex; align-items: baseline; gap: 0.35rem;">
          <span class="metric-numeral" style="font-size: 2.75rem; color: var(--maroon-900);">${formatCurrency(price)}</span>
          <span class="text-muted text-sm">${periodText}</span>
        </div>
        <ul style="list-style: none; padding: 0; margin: 0 0 2rem; display: flex; flex-direction: column; gap: 0.75rem; flex: 1;">
          ${(plan.features || []).map(f => `
            <li style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.9rem; color: var(--ink);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" class="icon icon-16" style="flex-shrink: 0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${f}</span>
            </li>
          `).join('')}
        </ul>
        <a href="/signup.html" class="btn ${isPopular ? 'btn-primary' : 'btn-secondary'} btn-lg" style="width: 100%;">
          Get Started
        </a>
      </div>
    `;
  }).join('');
}

function setupPricingToggle() {
  const monthlyBtn = document.getElementById('toggle-monthly');
  const yearlyBtn = document.getElementById('toggle-yearly');

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener('click', () => {
      billingMode = 'monthly';
      monthlyBtn.className = 'btn btn-primary btn-sm';
      yearlyBtn.className = 'btn btn-secondary btn-sm';
      renderPlans();
    });

    yearlyBtn.addEventListener('click', () => {
      billingMode = 'yearly';
      yearlyBtn.className = 'btn btn-primary btn-sm';
      monthlyBtn.className = 'btn btn-secondary btn-sm';
      renderPlans();
    });
  }
}

function setupFaq() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initPublicNavbar();
  loadLiveStats();
  loadPlans();
  setupPricingToggle();
  setupFaq();
});
