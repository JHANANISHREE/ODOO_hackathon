import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, openModal, closeModal, formatCurrency, formatDate } from '/assets/js/ui.js';

requireRole(['ADMIN', 'STAFF']);

const userStr = localStorage.getItem('user');
if (userStr) {
  try {
    const u = JSON.parse(userStr);
    const greet = document.getElementById('greeting-title');
    if (greet && u.name) {
      greet.textContent = `Welcome back, ${u.name.split(' ')[0]}`;
    }
  } catch (_) {}
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

let revenueChartInstance = null;
let planChartInstance = null;

function renderCharts(summary) {
  if (typeof Chart === 'undefined') return;

  const revCanvas = document.getElementById('revenue-chart');
  if (revCanvas && summary.revenue_chart) {
    if (revenueChartInstance) revenueChartInstance.destroy();

    const ctx = revCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    revenueChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: summary.revenue_chart.labels,
        datasets: [{
          label: 'Revenue ($)',
          data: summary.revenue_chart.data,
          borderColor: '#3b82f6',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Settled: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `$${val}`
            }
          }
        }
      }
    });
  }

  const planCanvas = document.getElementById('plan-distribution-chart');
  if (planCanvas && summary.plan_distribution) {
    if (planChartInstance) planChartInstance.destroy();

    const labels = summary.plan_distribution.labels.length ? summary.plan_distribution.labels : ['No Active Plans'];
    const data = summary.plan_distribution.data.length ? summary.plan_distribution.data : [1];

    const ctx = planCanvas.getContext('2d');
    planChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#ec4899',
            '#64748b'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        },
        cutout: '65%'
      }
    });
  }
}

function renderRecentSubscriptions(subs) {
  const tbody = document.getElementById('recent-subs-tbody');
  if (!tbody) return;

  if (!subs || !subs.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: var(--space-6);">No subscription enrollments recorded yet.</td></tr>`;
    return;
  }

  const badgeMap = {
    ACTIVE: 'badge-success',
    PENDING: 'badge-warning',
    PAUSED: 'badge-muted',
    EXPIRED: 'badge-danger',
    CANCELLED: 'badge-danger'
  };

  tbody.innerHTML = subs.map(s => {
    return `
      <tr>
        <td style="font-family: monospace; font-weight: var(--font-semibold); color: var(--color-primary);">${s.subscription_number}</td>
        <td>
          <div style="font-weight: var(--font-medium);">${s.customer_name}</div>
          <div class="text-xs text-muted">${s.customer_email || ''}</div>
        </td>
        <td><span class="badge badge-muted">${s.plan_name}</span></td>
        <td style="font-weight: var(--font-semibold);">${formatCurrency(s.recurring_total)}</td>
        <td><span class="badge ${badgeMap[s.status] || 'badge-muted'}">${s.status}</span></td>
        <td class="text-muted text-sm">${formatDate(s.created_at)}</td>
        <td style="text-align: right;">
          <a href="/admin/subscriptions.html" class="btn btn-secondary btn-sm">Inspect</a>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadDashboard() {
  try {
    const summary = await api.get('/api/dashboard/summary');

    document.getElementById('kpi-active-subs').textContent = summary.active_subscriptions || 0;
    document.getElementById('kpi-total-subs').textContent = `Total subscriptions in system: ${summary.total_subscriptions || 0}`;

    document.getElementById('kpi-mrr').textContent = formatCurrency(summary.mrr || 0);
    document.getElementById('kpi-arr').textContent = `ARR: ${formatCurrency(summary.arr || 0)} annualized`;

    document.getElementById('kpi-total-revenue').textContent = formatCurrency(summary.total_revenue || 0);

    document.getElementById('kpi-overdue-count').textContent = summary.overdue_invoices_count || 0;
    document.getElementById('kpi-outstanding-balance').textContent = `Outstanding: ${formatCurrency(summary.outstanding_balance || 0)}`;

    renderCharts(summary);
    renderRecentSubscriptions(summary.recent_subscriptions);
  } catch (err) {
    showToast(err.message || 'Failed to load dashboard metrics', 'danger');
  }
}

let wizardStep = 1;
const wizardModal = document.getElementById('wizard-modal');
const step1 = document.getElementById('step-1-content');
const step2 = document.getElementById('step-2-content');
const step3 = document.getElementById('step-3-content');
const prevBtn = document.getElementById('wizard-prev-btn');
const nextBtn = document.getElementById('wizard-next-btn');
const stepIndicator = document.getElementById('wizard-step-indicator');
const stepTitle = document.getElementById('wizard-step-title');

function setWizardStep(step) {
  wizardStep = step;
  step1.style.display = step === 1 ? 'block' : 'none';
  step2.style.display = step === 2 ? 'block' : 'none';
  step3.style.display = step === 3 ? 'block' : 'none';

  prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';

  if (step === 1) {
    stepIndicator.textContent = 'Step 1 of 3: Plan Identity';
    stepTitle.textContent = 'Launch New Billing Plan';
    nextBtn.textContent = 'Next: Pricing & Interval \u2192';
  } else if (step === 2) {
    stepIndicator.textContent = 'Step 2 of 3: Billing & Pricing';
    stepTitle.textContent = 'Plan Pricing Configuration';
    nextBtn.textContent = 'Next: Product Association \u2192';
  } else if (step === 3) {
    stepIndicator.textContent = 'Step 3 of 3: Review & Publish';
    stepTitle.textContent = 'Associate Product & Review';
    nextBtn.textContent = 'Publish New Plan';

    const pName = document.getElementById('w-name').value;
    const pCode = document.getElementById('w-code').value;
    const pPrice = document.getElementById('w-price').value;
    const pInt = document.getElementById('w-interval').value;
    const pMin = document.getElementById('w-minqty').value;

    document.getElementById('wizard-summary-preview').innerHTML = `
      <div><strong>${pName}</strong> (${pCode})</div>
      <div class="text-muted">${formatCurrency(pPrice)} billed ${pInt} (min quantity: ${pMin})</div>
    `;
  }
}

document.getElementById('launch-plan-btn')?.addEventListener('click', () => {
  setWizardStep(1);
  openModal(wizardModal);
});

document.getElementById('close-wizard-modal')?.addEventListener('click', () => closeModal(wizardModal));
document.getElementById('cancel-wizard-btn')?.addEventListener('click', () => closeModal(wizardModal));

prevBtn?.addEventListener('click', () => {
  if (wizardStep > 1) setWizardStep(wizardStep - 1);
});

nextBtn?.addEventListener('click', async () => {
  if (wizardStep === 1) {
    const name = document.getElementById('w-name').value.trim();
    const code = document.getElementById('w-code').value.trim();
    if (!name || !code) {
      showToast('Please enter both plan name and plan code', 'warning');
      return;
    }
    setWizardStep(2);
  } else if (wizardStep === 2) {
    const price = parseFloat(document.getElementById('w-price').value);
    if (isNaN(price) || price < 0) {
      showToast('Please specify a valid base recurring price', 'warning');
      return;
    }
    setWizardStep(3);
  } else if (wizardStep === 3) {
    try {
      const payload = {
        name: document.getElementById('w-name').value.trim(),
        code: document.getElementById('w-code').value.trim().toUpperCase(),
        description: document.getElementById('w-desc').value.trim(),
        billing_interval: document.getElementById('w-interval').value,
        price: parseFloat(document.getElementById('w-price').value),
        trial_days: parseInt(document.getElementById('w-trial').value, 10) || 0,
        minimum_quantity: parseInt(document.getElementById('w-minqty').value, 10) || 1,
        is_active: true
      };

      await api.post('/api/plans/', payload);
      closeModal(wizardModal);
      showToast(`Plan ${payload.name} launched successfully!`, 'success');
      loadDashboard();
    } catch (err) {
      showToast(err.message || 'Failed to create plan', 'danger');
    }
  }
});

loadDashboard();
