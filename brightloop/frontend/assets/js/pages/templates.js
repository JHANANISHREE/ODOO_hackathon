import { api } from '../api.js';
import { showToast, openModal, closeModal, formatCurrency } from '../ui.js';
import { enforceAuthGuard } from '/assets/js/guards.js';
import { logoutUser, fetchCurrentUserProfile } from '../auth.js';

enforceAuthGuard(['ADMIN', 'STAFF']);

let availablePlans = [];
let availableProducts = [];
let currentLines = [];

async function loadInitialData() {
  try {
    const plansRes = await api.get('/plans?size=100');
    availablePlans = plansRes.items || [];

    const planSelect = document.getElementById('template-plan-id');
    if (planSelect) {
      planSelect.innerHTML = availablePlans.map(p => `<option value="${p.id}">${p.name} (${formatCurrency(p.price)} / ${p.billing_period})</option>`).join('');
    }

    const prodsRes = await api.get('/products?size=100');
    availableProducts = prodsRes.items || [];

    const prodSelect = document.getElementById('line-product-select');
    if (prodSelect) {
      prodSelect.innerHTML = availableProducts.map(p => `<option value="${p.id}" data-price="${p.sales_price}">${p.name} (${formatCurrency(p.sales_price)})</option>`).join('');
    }
  } catch (err) {
    showToast('Failed to load plans or products catalog', 'error');
  }
}

async function loadTemplates(page = 1, search = '') {
  const tbody = document.getElementById('templates-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;"><div class="skeleton" style="height:24px;"></div></td></tr>`;

  try {
    const data = await api.get(`/templates?page=${page}&size=20&search=${encodeURIComponent(search)}`);
    renderTemplatesTable(data.items);
  } catch (err) {
    showToast(err.message || 'Failed to load templates', 'error');
  }
}

function renderTemplatesTable(templates) {
  const tbody = document.getElementById('templates-table-body');
  if (!tbody) return;

  if (templates.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <div class="empty-state-title">No quotation templates</div>
            <div class="empty-state-desc">Predefine plans and product lines to generate customer quotations with 1 click.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = templates.map(t => {
    const lineNames = (t.lines && t.lines.length > 0)
      ? t.lines.map(l => `${l.quantity}x ${l.product ? l.product.name : 'Product'}`).join(', ')
      : 'No product lines';

    return `
      <tr>
        <td>
          <div style="font-weight:600; color:var(--maroon-900);">${t.name}</div>
          <div class="text-muted" style="font-size:0.78rem;">${lineNames}</div>
        </td>
        <td><span class="badge badge-quotation">${t.plan ? t.plan.name : 'Plan ID ' + t.plan_id}</span></td>
        <td><strong>${t.validity_days} days</strong></td>
        <td><span class="badge badge-active">${t.lines ? t.lines.length : 0} lines</span></td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm delete-template-btn" data-id="${t.id}" style="color:var(--danger); border-color:#E8D0D3;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.delete-template-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTemplate(btn.dataset.id));
  });
}

async function deleteTemplate(id) {
  if (!confirm('Are you sure you want to delete this template?')) return;
  try {
    await api.delete(`/templates/${id}`);
    showToast('Template deleted successfully', 'success');
    loadTemplates();
  } catch (err) {
    showToast(err.message || 'Cannot delete template', 'error');
  }
}

function renderLinesList() {
  const container = document.getElementById('template-lines-list');
  if (!container) return;

  if (currentLines.length === 0) {
    container.innerHTML = `<div style="font-size:0.85rem; color:var(--muted); padding:0.5rem 0;">No lines added yet.</div>`;
    return;
  }

  container.innerHTML = currentLines.map((l, idx) => {
    const prod = availableProducts.find(p => p.id === l.product_id);
    const prodName = prod ? prod.name : `Product #${l.product_id}`;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.75rem; background-color:var(--cream-100); border-radius:var(--radius-sm); margin-bottom:0.4rem; font-size:0.85rem;">
        <div><strong>${l.quantity}x</strong> ${prodName} @ ${formatCurrency(l.unit_price)}</div>
        <button type="button" class="btn btn-secondary btn-sm remove-line-btn" data-index="${idx}" style="padding:0.2rem 0.5rem;">Remove</button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.remove-line-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLines.splice(parseInt(btn.dataset.index, 10), 1);
      renderLinesList();
    });
  });
}

function setupEventHandlers() {
  const addBtn = document.getElementById('open-create-template-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      currentLines = [];
      document.getElementById('template-form').reset();
      renderLinesList();
      openModal('template-modal');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  const addLineBtn = document.getElementById('add-line-btn');
  if (addLineBtn) {
    addLineBtn.addEventListener('click', () => {
      const prodSelect = document.getElementById('line-product-select');
      const qtyInput = document.getElementById('line-qty');
      const priceInput = document.getElementById('line-price');

      const productId = parseInt(prodSelect.value, 10);
      const quantity = parseInt(qtyInput.value, 10) || 1;
      let unitPrice = parseFloat(priceInput.value);

      if (isNaN(unitPrice) || unitPrice <= 0) {
        const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
        unitPrice = parseFloat(selectedOpt.dataset.price || 0);
      }

      currentLines.push({
        product_id: productId,
        quantity,
        unit_price: unitPrice
      });

      renderLinesList();
    });
  }

  const templateForm = document.getElementById('template-form');
  if (templateForm) {
    templateForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (currentLines.length === 0) {
        showToast('Please add at least one product line to the template', 'error');
        return;
      }

      const payload = {
        name: document.getElementById('template-name').value.trim(),
        validity_days: parseInt(document.getElementById('template-validity').value, 10),
        plan_id: parseInt(document.getElementById('template-plan-id').value, 10),
        lines: currentLines
      };

      try {
        await api.post('/templates', payload);
        showToast('Quotation template created successfully', 'success');
        closeModal('template-modal');
        loadTemplates();
      } catch (err) {
        showToast(err.message || 'Failed to create template', 'error');
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
  await loadInitialData();
  setupEventHandlers();
  loadTemplates();
});
