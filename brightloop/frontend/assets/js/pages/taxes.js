import { api } from '../api.js';
import { showToast, openModal, closeModal } from '../ui.js';
import { enforceAuthGuard } from '/assets/js/guards.js';
import { logoutUser, fetchCurrentUserProfile } from '../auth.js';

enforceAuthGuard(['ADMIN']);

let currentTaxId = null;

async function loadTaxes(page = 1, search = '') {
  const tbody = document.getElementById('taxes-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;"><div class="skeleton" style="height:24px;"></div></td></tr>`;

  try {
    const data = await api.get(`/taxes?page=${page}&size=50&search=${encodeURIComponent(search)}`);
    renderTaxesTable(data.items);
  } catch (err) {
    showToast(err.message || 'Failed to load tax rules', 'error');
  }
}

function renderTaxesTable(taxes) {
  const tbody = document.getElementById('taxes-table-body');
  if (!tbody) return;

  if (taxes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            <div class="empty-state-title">No tax rules found</div>
            <div class="empty-state-desc">Configure GST, VAT, or local sales taxes to automate line computations.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = taxes.map(t => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td><span class="badge badge-quotation">${t.tax_type}</span></td>
      <td><strong>${t.rate}${t.tax_type === 'percentage' ? '%' : ' Fixed'}</strong></td>
      <td>${t.applies_to_category || 'All Categories'}</td>
      <td>${t.is_active ? '<span class="badge badge-active"><span class="badge-dot"></span>Active</span>' : '<span class="badge badge-draft">Inactive</span>'}</td>
      <td>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary btn-sm edit-tax-btn" data-id="${t.id}">Edit</button>
          <button class="btn btn-secondary btn-sm delete-tax-btn" data-id="${t.id}" style="color:var(--danger); border-color:#E8D0D3;">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.edit-tax-btn').forEach(btn => {
    btn.addEventListener('click', () => editTax(btn.dataset.id));
  });

  document.querySelectorAll('.delete-tax-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTax(btn.dataset.id));
  });
}

async function editTax(id) {
  try {
    const t = await api.get(`/taxes/${id}`);
    currentTaxId = t.id;
    document.getElementById('modal-tax-title').textContent = 'Edit Tax Rule';
    document.getElementById('tax-name').value = t.name;
    document.getElementById('tax-type').value = t.tax_type;
    document.getElementById('tax-rate').value = t.rate;
    document.getElementById('tax-category').value = t.applies_to_category || '';
    document.getElementById('tax-active').checked = t.is_active;
    openModal('tax-modal');
  } catch (err) {
    showToast(err.message || 'Error fetching tax', 'error');
  }
}

async function deleteTax(id) {
  if (!confirm('Are you sure you want to delete this tax rule?')) return;
  try {
    await api.delete(`/taxes/${id}`);
    showToast('Tax rule deleted', 'success');
    loadTaxes();
  } catch (err) {
    showToast(err.message || 'Cannot delete tax rule', 'error');
  }
}

function setupEventHandlers() {
  const addBtn = document.getElementById('open-create-tax-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      currentTaxId = null;
      document.getElementById('modal-tax-title').textContent = 'Create Tax Rule';
      document.getElementById('tax-form').reset();
      document.getElementById('tax-active').checked = true;
      openModal('tax-modal');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  const form = document.getElementById('tax-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('tax-name').value.trim(),
        tax_type: document.getElementById('tax-type').value,
        rate: parseFloat(document.getElementById('tax-rate').value),
        applies_to_category: document.getElementById('tax-category').value.trim() || null,
        is_active: document.getElementById('tax-active').checked
      };

      try {
        if (currentTaxId) {
          await api.put(`/taxes/${currentTaxId}`, payload);
          showToast('Tax rule updated successfully', 'success');
        } else {
          await api.post('/taxes', payload);
          showToast('Tax rule created successfully', 'success');
        }
        closeModal('tax-modal');
        loadTaxes();
      } catch (err) {
        showToast(err.message || 'Failed to save tax rule', 'error');
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
  loadTaxes();
});
