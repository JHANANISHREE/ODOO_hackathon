import { api } from '../api.js';
import { showToast, openModal, closeModal, formatCurrency, formatDate } from '../ui.js';
import { enforceAuthGuard } from '../guards.js';
import { logoutUser, fetchCurrentUserProfile } from '../auth.js';

enforceAuthGuard(['ADMIN', 'STAFF']);

let availablePlans = [];
let availableCustomers = [];
let availableProducts = [];
let availableTaxes = [];
let availableTemplates = [];
let createLines = [];
let activeFilterStatus = '';

async function loadLookups() {
  try {
    const plansRes = await api.get('/plans?active_only=true&size=100');
    availablePlans = plansRes.items || [];
    const planSel = document.getElementById('sub-plan-id');
    if (planSel) {
      planSel.innerHTML = availablePlans.map(p => `<option value="${p.id}">${p.name} (${formatCurrency(p.price)} / ${p.billing_period})</option>`).join('');
    }

    const custRes = await api.get('/users?role=CUSTOMER&size=100');
    availableCustomers = custRes.items || [];
    const custSel = document.getElementById('sub-customer-id');
    const custFromTempSel = document.getElementById('temp-customer-id');
    const custOpts = availableCustomers.map(c => `<option value="${c.id}">${c.name} (${c.email})</option>`).join('');
    if (custSel) custSel.innerHTML = custOpts;
    if (custFromTempSel) custFromTempSel.innerHTML = custOpts;

    const prodRes = await api.get('/products?active_only=true&size=100');
    availableProducts = prodRes.items || [];
    const prodSel = document.getElementById('sub-line-product');
    if (prodSel) {
      prodSel.innerHTML = availableProducts.map(p => `<option value="${p.id}" data-price="${p.sales_price}">${p.name} (${formatCurrency(p.sales_price)})</option>`).join('');
    }

    const taxRes = await api.get('/taxes?active_only=true&size=100');
    availableTaxes = taxRes.items || [];
    const taxSel = document.getElementById('sub-line-tax');
    if (taxSel) {
      taxSel.innerHTML = `<option value="">No Tax</option>` + availableTaxes.map(t => `<option value="${t.id}">${t.name} (${t.rate}${t.tax_type === 'percentage' ? '%' : '$'})</option>`).join('');
    }

    const tempRes = await api.get('/templates?size=100');
    availableTemplates = tempRes.items || [];
    const tempSel = document.getElementById('template-select');
    if (tempSel) {
      tempSel.innerHTML = availableTemplates.map(t => `<option value="${t.id}">${t.name} (Valid: ${t.validity_days}d)</option>`).join('');
    }
  } catch (err) {
    showToast('Failed to load lookup catalogs', 'error');
  }
}

async function loadSubscriptions(page = 1, search = '') {
  const tbody = document.getElementById('subs-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;"><div class="skeleton" style="height:24px;"></div></td></tr>`;

  try {
    let url = `/subscriptions?page=${page}&size=20&search=${encodeURIComponent(search)}`;
    if (activeFilterStatus) {
      url += `&status=${encodeURIComponent(activeFilterStatus)}`;
    }
    const data = await api.get(url);
    renderSubscriptionsTable(data.items);
  } catch (err) {
    showToast(err.message || 'Failed to load subscriptions', 'error');
  }
}

function renderSubscriptionsTable(subs) {
  const tbody = document.getElementById('subs-table-body');
  if (!tbody) return;

  if (subs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            <div class="empty-state-title">No subscriptions found</div>
            <div class="empty-state-desc">Create your first subscription or convert a quotation template to begin.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = subs.map(s => {
    let badgeClass = 'badge-draft';
    if (s.status === 'quotation') badgeClass = 'badge-quotation';
    else if (s.status === 'confirmed') badgeClass = 'badge-confirmed';
    else if (s.status === 'active') badgeClass = 'badge-active';
    else if (s.status === 'closed') badgeClass = 'badge-closed';

    const customerName = s.customer ? s.customer.name : `Customer #${s.customer_id}`;
    const planName = s.plan ? s.plan.name : `Plan #${s.plan_id}`;
    const pauseBadge = s.is_paused ? '<span class="badge badge-overdue" style="font-size:0.68rem; margin-left:4px;">PAUSED</span>' : '';

    return `
      <tr>
        <td><strong>${s.subscription_number}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--maroon-900);">${customerName}</div>
          <div class="text-muted" style="font-size:0.78rem;">${s.customer ? s.customer.email : ''}</div>
        </td>
        <td>
          <div>${planName}</div>
          <div class="text-muted" style="font-size:0.75rem;">${s.payment_terms}</div>
        </td>
        <td>
          <span class="badge ${badgeClass}"><span class="badge-dot"></span>${s.status}</span>
          ${pauseBadge}
        </td>
        <td><strong style="font-family:var(--font-heading); font-size:1.05rem;">${formatCurrency(s.total_amount)}</strong></td>
        <td>
          <div style="font-size:0.8rem;">Start: ${formatDate(s.start_date)}</div>
          <div style="font-size:0.8rem; color:var(--muted);">Exp: ${formatDate(s.expiry_date)}</div>
        </td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm view-sub-btn" data-id="${s.id}">View</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.view-sub-btn').forEach(btn => {
    btn.addEventListener('click', () => openSubscriptionDetail(btn.dataset.id));
  });
}

async function openSubscriptionDetail(id) {
  try {
    const s = await api.get(`/subscriptions/${id}`);
    document.getElementById('detail-sub-number').textContent = s.subscription_number;
    document.getElementById('detail-customer-name').textContent = s.customer ? s.customer.name : 'Unknown';
    document.getElementById('detail-plan-name').textContent = s.plan ? s.plan.name : 'Unknown';
    document.getElementById('detail-total').textContent = formatCurrency(s.total_amount);
    document.getElementById('detail-dates').textContent = `${formatDate(s.start_date)} to ${formatDate(s.expiry_date)}`;
    document.getElementById('detail-terms').textContent = s.payment_terms;

    updateVisualStepper(s.status);

    const actionContainer = document.getElementById('detail-actions-container');
    actionContainer.innerHTML = '';

    if (s.status === 'draft') {
      actionContainer.innerHTML += `<button class="btn btn-primary btn-sm transition-btn" data-action="quotation">Submit Quotation</button>`;
    } else if (s.status === 'quotation') {
      actionContainer.innerHTML += `
        <button class="btn btn-primary btn-sm transition-btn" data-action="confirmed">Confirm Order</button>
        <button class="btn btn-secondary btn-sm transition-btn" data-action="draft">Back to Draft</button>
      `;
    } else if (s.status === 'confirmed') {
      actionContainer.innerHTML += `
        <button class="btn btn-primary btn-sm transition-btn" data-action="active">Activate Subscription</button>
        <button class="btn btn-secondary btn-sm transition-btn" data-action="draft">Revoke to Draft</button>
      `;
    } else if (s.status === 'active') {
      if (s.plan && s.plan.pausable) {
        actionContainer.innerHTML += `<button class="btn btn-secondary btn-sm toggle-pause-btn">${s.is_paused ? 'Resume' : 'Pause'}</button>`;
      }
      if (s.plan && s.plan.closable) {
        actionContainer.innerHTML += `<button class="btn btn-secondary btn-sm transition-btn" data-action="closed" style="color:var(--danger); border-color:#E8D0D3;">Close</button>`;
      }
    } else if (s.status === 'closed') {
      if (s.plan && s.plan.renewable) {
        actionContainer.innerHTML += `<button class="btn btn-primary btn-sm renew-btn">Renew Subscription</button>`;
      }
    }

    const linesBody = document.getElementById('detail-lines-body');
    if (linesBody) {
      linesBody.innerHTML = (s.lines && s.lines.length > 0)
        ? s.lines.map(l => `
          <tr>
            <td>
              <strong>${l.product ? l.product.name : 'Product #' + l.product_id}</strong>
              ${l.variant ? `<div class="text-muted" style="font-size:0.75rem;">${l.variant.attribute_name}: ${l.variant.attribute_value}</div>` : ''}
            </td>
            <td>${l.quantity}</td>
            <td>${formatCurrency(l.unit_price)}</td>
            <td>${formatCurrency(l.tax_amount)}</td>
            <td><strong>${formatCurrency(l.line_amount)}</strong></td>
          </tr>
        `).join('')
        : `<tr><td colspan="5" class="text-muted">No lines</td></tr>`;
    }

    const auditContainer = document.getElementById('detail-audit-logs');
    if (auditContainer) {
      auditContainer.innerHTML = (s.audit_logs && s.audit_logs.length > 0)
        ? s.audit_logs.map(a => `
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:0.4rem 0; border-bottom:1px solid var(--cream-100);">
            <div><strong>${a.from_status.toUpperCase()} &rarr; ${a.to_status.toUpperCase()}</strong> (${a.action_note || 'Status updated'})</div>
            <div class="text-muted">${formatDate(a.created_at)}</div>
          </div>
        `).join('')
        : '<div class="text-muted" style="font-size:0.8rem;">No audit logs</div>';
    }

    actionContainer.querySelectorAll('.transition-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.post(`/subscriptions/${s.id}/transition`, { action: btn.dataset.action });
          showToast(`Transitioned to ${btn.dataset.action}`, 'success');
          openSubscriptionDetail(s.id);
          loadSubscriptions();
        } catch (err) {
          showToast(err.message || 'Transition failed', 'error');
        }
      });
    });

    const pauseBtn = actionContainer.querySelector('.toggle-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', async () => {
        try {
          await api.post(`/subscriptions/${s.id}/toggle-pause`, {});
          showToast('Subscription state updated', 'success');
          openSubscriptionDetail(s.id);
          loadSubscriptions();
        } catch (err) {
          showToast(err.message || 'Action failed', 'error');
        }
      });
    }

    const renewBtn = actionContainer.querySelector('.renew-btn');
    if (renewBtn) {
      renewBtn.addEventListener('click', async () => {
        try {
          await api.post(`/subscriptions/${s.id}/renew`, {});
          showToast('Subscription renewed successfully', 'success');
          openSubscriptionDetail(s.id);
          loadSubscriptions();
        } catch (err) {
          showToast(err.message || 'Action failed', 'error');
        }
      });
    }

    openModal('subscription-detail-modal');
  } catch (err) {
    showToast(err.message || 'Failed to open subscription detail', 'error');
  }
}

function updateVisualStepper(currentStatus) {
  const steps = ['draft', 'quotation', 'confirmed', 'active', 'closed'];
  const currentIndex = steps.indexOf(currentStatus);

  document.querySelectorAll('.stepper .step-item').forEach((item, idx) => {
    item.classList.remove('active', 'completed');
    if (idx < currentIndex) {
      item.classList.add('completed');
    } else if (idx === currentIndex) {
      item.classList.add('active');
    }
  });
}

function renderCreateLines() {
  const container = document.getElementById('sub-create-lines-list');
  if (!container) return;

  if (createLines.length === 0) {
    container.innerHTML = `<div style="font-size:0.85rem; color:var(--muted); padding:0.5rem 0;">No lines added.</div>`;
    return;
  }

  container.innerHTML = createLines.map((l, idx) => {
    const prod = availableProducts.find(p => p.id === l.product_id);
    const prodName = prod ? prod.name : `Product #${l.product_id}`;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; background-color:var(--cream-100); border-radius:var(--radius-sm); margin-bottom:0.3rem; font-size:0.82rem;">
        <div><strong>${l.quantity}x</strong> ${prodName}</div>
        <button type="button" class="btn btn-secondary btn-sm remove-sub-line" data-index="${idx}" style="padding:0.15rem 0.4rem;">Remove</button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.remove-sub-line').forEach(btn => {
    btn.addEventListener('click', () => {
      createLines.splice(parseInt(btn.dataset.index, 10), 1);
      renderCreateLines();
    });
  });
}

function setupEventHandlers() {
  const openNewSubBtn = document.getElementById('open-create-sub-btn');
  if (openNewSubBtn) {
    openNewSubBtn.addEventListener('click', () => {
      createLines = [];
      document.getElementById('sub-form').reset();
      renderCreateLines();
      openModal('sub-create-modal');
    });
  }

  const openFromTempBtn = document.getElementById('open-from-template-btn');
  if (openFromTempBtn) {
    openFromTempBtn.addEventListener('click', () => {
      openModal('from-template-modal');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  const addLineBtn = document.getElementById('add-sub-line-btn');
  if (addLineBtn) {
    addLineBtn.addEventListener('click', () => {
      const prodSelect = document.getElementById('sub-line-product');
      const qtyInput = document.getElementById('sub-line-qty');
      const taxSelect = document.getElementById('sub-line-tax');

      const productId = parseInt(prodSelect.value, 10);
      const quantity = parseInt(qtyInput.value, 10) || 1;
      const taxId = taxSelect.value ? parseInt(taxSelect.value, 10) : null;

      createLines.push({
        product_id: productId,
        quantity,
        tax_id: taxId
      });

      renderCreateLines();
    });
  }

  const subForm = document.getElementById('sub-form');
  if (subForm) {
    subForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (createLines.length === 0) {
        showToast('Please add at least one line item', 'error');
        return;
      }

      const payload = {
        customer_id: parseInt(document.getElementById('sub-customer-id').value, 10),
        plan_id: parseInt(document.getElementById('sub-plan-id').value, 10),
        start_date: document.getElementById('sub-start-date').value || null,
        payment_terms: document.getElementById('sub-terms').value || 'Immediate Payment',
        lines: createLines
      };

      try {
        await api.post('/subscriptions', payload);
        showToast('Subscription created in Draft status', 'success');
        closeModal('sub-create-modal');
        loadSubscriptions();
      } catch (err) {
        showToast(err.message || 'Failed to create subscription', 'error');
      }
    });
  }

  const templateForm = document.getElementById('from-template-form');
  if (templateForm) {
    templateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        template_id: parseInt(document.getElementById('template-select').value, 10),
        customer_id: parseInt(document.getElementById('temp-customer-id').value, 10)
      };

      try {
        await api.post('/subscriptions/from-template', payload);
        showToast('Quotation created from template', 'success');
        closeModal('from-template-modal');
        loadSubscriptions();
      } catch (err) {
        showToast(err.message || 'Failed to create quotation', 'error');
      }
    });
  }

  document.querySelectorAll('.status-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.status-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilterStatus = pill.dataset.status;
      loadSubscriptions();
    });
  });

  const searchInput = document.getElementById('search-subs');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadSubscriptions(1, searchInput.value);
      }, 300);
    });
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await fetchCurrentUserProfile();
  if (user) {
    const nameEl = document.getElementById('admin-user-name');
    const roleEl = document.getElementById('admin-user-role');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
  }
  await loadLookups();
  setupEventHandlers();
  loadSubscriptions();
});
