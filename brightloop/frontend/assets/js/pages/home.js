import { api } from '../api.js';
import { countUp, formatCurrency } from '../ui.js';

let plansData = [];
let billingMode = 'monthly';

async function loadPlans() {
  const container = document.getElementById('pricing-grid');
  if (!container) return;

  try {
    plansData = await api.get('/public/plans');
    renderPlans();
  } catch (err) {
    plansData = [
      {
        id: 1,
        name: "Starter Loop",
        price_monthly: 49,
        price_yearly: 490,
        description: "Essential recurring billing and invoice generation for early-stage SaaS and startups.",
        features: [
          "Up to 250 active subscriptions",
          "Automated recurring invoicing",
          "Quotation templates",
          "Standard tax & discount engine",
          "Customer self-service portal"
        ],
        popular: false,
        badge: "Entry"
      },
      {
        id: 2,
        name: "Growth Pro",
        price_monthly: 149,
        price_yearly: 1490,
        description: "Powerhouse subscription lifecycle management with multi-variant billing and scheduler.",
        features: [
          "Up to 2,500 active subscriptions",
          "Idempotent automated billing run",
          "Partial payments & UPI/Cards/Bank",
          "Advanced role-based access (Admin/Staff)",
          "Full audit trail & state machine",
          "Email notifications & PDF invoices"
        ],
        popular: true,
        badge: "Most Popular"
      },
      {
        id: 3,
        name: "Enterprise Infinite",
        price_monthly: 399,
        price_yearly: 3990,
        description: "High-volume subscription architecture engineered for speed, custom lines and scale.",
        features: [
          "Unlimited subscriptions & invoices",
          "Sub-second reporting dashboard",
          "Custom variant matrices & add-ons",
          "Dedicated scheduler & batch billing",
          "Full REST API integration",
          "Priority 24/7 engineering SLA"
        ],
        popular: false,
        badge: "Enterprise"
      }
    ];
    renderPlans();
  }
}

function renderPlans() {
  const container = document.getElementById('pricing-grid');
  if (!container) return;

  container.innerHTML = plansData.map(plan => {
    const price = billingMode === 'monthly' ? plan.price_monthly : plan.price_yearly;
    const periodText = billingMode === 'monthly' ? '/ month' : '/ year';
    const featuredClass = plan.popular ? 'featured' : '';

    return `
      <div class="pricing-card ${featuredClass}">
        ${plan.popular ? '<div style="position:absolute; top:-12px; right:24px;" class="badge badge-active">Most Popular</div>' : ''}
        <h3 style="margin-bottom: 0.5rem;">${plan.name}</h3>
        <p class="text-muted" style="min-height: 48px; font-size: 0.88rem;">${plan.description}</p>
        <div class="pricing-price">
          ${formatCurrency(price)}
          <span class="pricing-period">${periodText}</span>
        </div>
        <ul class="pricing-features">
          ${plan.features.map(f => `
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success-ink)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${f}</span>
            </li>
          `).join('')}
        </ul>
        <a href="/signup.html" class="btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-lg" style="width: 100%;">
          Start Free Trial
        </a>
      </div>
    `;
  }).join('');
}

async function loadStats() {
  const subEl = document.getElementById('stat-subscriptions');
  const invEl = document.getElementById('stat-invoices');
  const upEl = document.getElementById('stat-uptime');
  const timeEl = document.getElementById('stat-speed');

  try {
    const stats = await api.get('/public/stats');
    if (subEl) subEl.textContent = stats.active_subscriptions;
    if (invEl) invEl.textContent = stats.invoices_automated;
    if (upEl) upEl.textContent = stats.uptime;
    if (timeEl) timeEl.textContent = stats.processing_time;
  } catch (err) {
    if (subEl) subEl.textContent = '12,480+';
    if (invEl) invEl.textContent = '$8.4M+';
    if (upEl) upEl.textContent = '99.99%';
    if (timeEl) timeEl.textContent = '< 0.05s';
  }
}

function setupPricingToggle() {
  const monthlyBtn = document.getElementById('toggle-monthly');
  const yearlyBtn = document.getElementById('toggle-yearly');

  if (monthlyBtn && yearlyBtn) {
    monthlyBtn.addEventListener('click', () => {
      billingMode = 'monthly';
      monthlyBtn.classList.add('btn-primary');
      monthlyBtn.classList.remove('btn-secondary');
      yearlyBtn.classList.add('btn-secondary');
      yearlyBtn.classList.remove('btn-primary');
      renderPlans();
    });

    yearlyBtn.addEventListener('click', () => {
      billingMode = 'yearly';
      yearlyBtn.classList.add('btn-primary');
      yearlyBtn.classList.remove('btn-secondary');
      monthlyBtn.classList.add('btn-secondary');
      monthlyBtn.classList.remove('btn-primary');
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

function setupMobileNav() {
  const btn = document.getElementById('mobile-toggle-btn');
  const nav = document.getElementById('public-nav-links');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPlans();
  loadStats();
  setupPricingToggle();
  setupFaq();
  setupMobileNav();
});
