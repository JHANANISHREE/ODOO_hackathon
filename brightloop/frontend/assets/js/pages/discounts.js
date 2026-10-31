import { api } from '../api.js';
import { showToast, openModal, closeModal, formatCurrency } from '../ui.js';
import { enforceAuthGuard } from '/assets/js/guards.js';
import { logoutUser, fetchCurrentUserProfile } from '../auth.js';

enforceAuthGuard(['ADMIN']);

let currentDiscountId = null;
let availableProducts = [];

async function loadProducts() {
  try {
    const res = await api.get('/products?size=100');
    availableProducts = res.items || [];
    const prodSel = document.getElementById('discount-product-id');
    if (prodSel) {
      prodSel.innerHTML = `<option value="">Entire Subscription / Order</option>` + availableProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
  } catch (err) {
    showToast('Failed to load products list', 'error');
  }
}

async function loadDiscounts(page = 1, search = '') {
  const tbody = document.getElementById('discounts-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;"><div class="skeleton" style="height:24px;"></div></td></tr>`;

  try {
    const data = await api.get(`/discounts?page=${page}&size=50&search=${encodeURIComponent(search)}`);
    renderDiscountsTable(data.items);
  } catch (err) {
    showToast(err.message || 'Failed to load discount rules', 'error');
  }
}

function renderDiscountsTable(discounts) {
  const tbody = document.getElementById('discounts-table-body');
  if (!tbody) return;

  if (discounts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <div class="empty-state-title">No discount campaigns</div>
            <div class="empty-state-desc">Define percentage or fixed discount vouchers with usage limits and cart minimums.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = discounts.map(d => {
    const targetProduct = d.product ? d.product.name : 'Entire Subscription';
    const usage = d.usage_limit ? `${d.used_count} / ${d.usage_limit}` : `${d.used_count} (Unlimited)`;

    return `
      <tr>
        <td><strong style="color:var(--maroon-900);">${d.code}</strong></td>
        <td><span class="badge badge-quotation">${d.discount_type}</span></td>
        <td><strong>${d.discount_type === 'percentage' ? d.value + '%' : formatCurrency(d.value)}</strong></td>
        <td>
          <div style="font-size:0.8rem;">Min Cart: ${d.minimum_purchase_amount ? formatCurrency(d.minimum_purchase_amount) : 'None'}</div>
          <div style="font-size:0.8rem; color:var(--muted);">Target: ${targetProduct}</div>
        </td>
        <td><strong>${usage}</strong></td>
        <td>${d.is_active ? '<span class="badge badge-active"><span class="badge-dot"></span>Active</span>' : '<span class="badge badge-draft">Inactive</span>'}</td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm delete-discount-btn" data-id="${d.id}" style="color:var(--danger); border-color:#E8D0D3;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.delete-discount-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteDiscount(btn.dataset.id));
  });
}

async function deleteDiscount(id) {
  if (!confirm('Are you sure you want to delete this discount code?')) return;
  try {
    await api.delete(`/discounts/${id}`);
    showToast('Discount rule deleted', 'success');
    loadDiscounts();
  } catch (err) {
    showToast(err.message || 'Cannot delete discount', 'error');
  }
}

function setupEventHandlers() {
  const addBtn = document.getElementById('open-create-discount-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      currentDiscountId = null;
      document.getElementById('discount-form').reset();
      document.getElementById('discount-active').checked = true;
      openModal('discount-modal');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  const form = document.getElementById('discount-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const minPurch = document.getElementById('discount-min-purch').value;
      const minQty = document.getElementById('discount-min-qty').value;
      const usageLimit = document.getElementById('discount-limit').value;
      const prodId = document.getElementById('discount-product-id').value;

      const payload = {
        code: document.getElementById('discount-code').value.trim().toUpperCase(),
        discount_type: document.getElementById('discount-type').value,
        value: parseFloat(document.getElementById('discount-val').value),
        minimum_purchase_amount: minPurch ? parseFloat(minPurch) : null,
        minimum_quantity: minQty ? parseInt(minQty, 10) : null,
        start_date: document.getElementById('discount-start').value || null,
        end_date: document.getElementById('discount-end').value || null,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
        applies_to_product_id: prodId ? parseInt(prodId, 10) : null,
        is_active: document.getElementById('discount-active').checked
      };

      try {
        await api.post('/discounts', payload);
        showToast('Discount rule created successfully', 'success');
        closeModal('discount-modal');
        loadDiscounts();
      } catch (err) {
        showToast(err.message || 'Failed to save discount rule', 'error');
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
  await loadProducts();
  setupEventHandlers();
  loadDiscounts();
});
