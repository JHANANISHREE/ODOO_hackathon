import { api } from '../api.js';
import { showToast, openModal, closeModal, formatCurrency } from '../ui.js';
import { enforceAuthGuard } from '../guards.js';
import { logoutUser, fetchCurrentUserProfile } from '../auth.js';

enforceAuthGuard(['ADMIN', 'STAFF']);

let currentPlanId = null;

async function loadPlans(page = 1, search = '') {
  const tbody = document.getElementById('plans-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;"><div class="skeleton" style="height:24px;"></div></td></tr>`;

  try {
    const data = await api.get(`/plans?page=${page}&size=20&search=${encodeURIComponent(search)}`);
    renderPlansTable(data.items);
  } catch (err) {
    showToast(err.message || 'Failed to load plans', 'error');
  }
}

function renderPlansTable(plans) {
  const tbody = document.getElementById('plans-table-body');
  if (!tbody) return;

  if (plans.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <div class="empty-state-title">No billing plans found</div>
            <div class="empty-state-desc">Create daily, monthly, or annual subscription tiers with custom business rules.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = plans.map(p => {
    const flags = [];
    if (p.pausable) flags.push('<span class="badge badge-active" style="font-size:0.7rem;">Pausable</span>');
    if (p.renewable) flags.push('<span class="badge badge-active" style="font-size:0.7rem;">Renewable</span>');
    if (p.closable) flags.push('<span class="badge badge-draft" style="font-size:0.7rem;">Closable</span>');
    if (p.auto_close) flags.push('<span class="badge badge-overdue" style="font-size:0.7rem;">Auto-Close</span>');

    return `
      <tr>
        <td>
          <div style="font-weight:600; color:var(--maroon-900);">${p.name}</div>
          <div class="text-muted" style="font-size:0.78rem;">Min Quantity: ${p.minimum_quantity}</div>
        </td>
        <td><strong style="color:var(--maroon-900);">${formatCurrency(p.price)}</strong></td>
        <td><span class="badge badge-quotation">${p.billing_period}</span></td>
        <td>
          <div style="font-size:0.8rem;">From: ${p.available_from || 'Always'}</div>
          <div style="font-size:0.8rem; color:var(--muted);">To: ${p.available_to || 'Unlimited'}</div>
        </td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${flags.join('')}</div></td>
        <td>${p.is_active ? '<span class="badge badge-active"><span class="badge-dot"></span>Active</span>' : '<span class="badge badge-draft">Inactive</span>'}</td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm edit-plan-btn" data-id="${p.id}">Edit</button>
            <button class="btn btn-secondary btn-sm delete-plan-btn" data-id="${p.id}" style="color:var(--danger); border-color:#E8D0D3;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.edit-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => editPlan(btn.dataset.id));
  });

  document.querySelectorAll('.delete-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePlan(btn.dataset.id));
  });
}

async function editPlan(id) {
  try {
    const p = await api.get(`/plans/${id}`);
    currentPlanId = p.id;
    document.getElementById('modal-plan-title').textContent = 'Edit Plan';
    document.getElementById('plan-name').value = p.name;
    document.getElementById('plan-price').value = p.price;
    document.getElementById('plan-period').value = p.billing_period;
    document.getElementById('plan-min-qty').value = p.minimum_quantity;
    document.getElementById('plan-avail-from').value = p.available_from || '';
    document.getElementById('plan-avail-to').value = p.available_to || '';
    document.getElementById('plan-pausable').checked = p.pausable;
    document.getElementById('plan-renewable').checked = p.renewable;
    document.getElementById('plan-closable').checked = p.closable;
    document.getElementById('plan-auto-close').checked = p.auto_close;
    document.getElementById('plan-active').checked = p.is_active;
    openModal('plan-modal');
  } catch (err) {
    showToast(err.message || 'Error fetching plan', 'error');
  }
}

async function deletePlan(id) {
  if (!confirm('Are you sure you want to delete this plan?')) return;
  try {
    await api.delete(`/plans/${id}`);
    showToast('Plan deleted successfully', 'success');
    loadPlans();
  } catch (err) {
    showToast(err.message || 'Cannot delete plan', 'error');
  }
}

function setupEventHandlers() {
  const addBtn = document.getElementById('open-create-plan-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      currentPlanId = null;
      document.getElementById('modal-plan-title').textContent = 'Create Billing Plan';
      document.getElementById('plan-form').reset();
      document.getElementById('plan-pausable').checked = true;
      document.getElementById('plan-renewable').checked = true;
      document.getElementById('plan-closable').checked = true;
      document.getElementById('plan-active').checked = true;
      openModal('plan-modal');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  const planForm = document.getElementById('plan-form');
  if (planForm) {
    planForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const availFrom = document.getElementById('plan-avail-from').value || null;
      const availTo = document.getElementById('plan-avail-to').value || null;

      if (availFrom && availTo && availTo < availFrom) {
        showToast('Available-to date cannot be earlier than available-from date', 'error');
        return;
      }

      const payload = {
        name: document.getElementById('plan-name').value.trim(),
        price: parseFloat(document.getElementById('plan-price').value),
        billing_period: document.getElementById('plan-period').value,
        minimum_quantity: parseInt(document.getElementById('plan-min-qty').value, 10),
        available_from: availFrom,
        available_to: availTo,
        pausable: document.getElementById('plan-pausable').checked,
        renewable: document.getElementById('plan-renewable').checked,
        closable: document.getElementById('plan-closable').checked,
        auto_close: document.getElementById('plan-auto-close').checked,
        is_active: document.getElementById('plan-active').checked
      };

      try {
        if (currentPlanId) {
          await api.put(`/plans/${currentPlanId}`, payload);
          showToast('Plan updated successfully', 'success');
        } else {
          await api.post('/plans', payload);
          showToast('Plan created successfully', 'success');
        }
        closeModal('plan-modal');
        loadPlans();
      } catch (err) {
        showToast(err.message || 'Failed to save plan', 'error');
      }
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
  setupEventHandlers();
  loadPlans();
});
