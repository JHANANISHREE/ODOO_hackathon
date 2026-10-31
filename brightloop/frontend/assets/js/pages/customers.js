import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, openModal, closeModal, formatDate } from '/assets/js/ui.js';
import { validatePassword } from '/assets/js/validators.js';

requireRole(['ADMIN', 'STAFF']);

let customersState = [];

const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const customersTbody = document.getElementById('customers-tbody');
const customersCounter = document.getElementById('customers-counter');
const customerModal = document.getElementById('customer-modal');
const customerForm = document.getElementById('customer-form');
const modalTitle = document.getElementById('modal-title');
const custIdInput = document.getElementById('customer-id');
const custNameInput = document.getElementById('cust-name');
const custEmailInput = document.getElementById('cust-email');
const custPasswordInput = document.getElementById('cust-password');
const custPhoneInput = document.getElementById('cust-phone');
const custActiveInput = document.getElementById('cust-active');
const passwordGroup = document.getElementById('password-group');
const statusGroup = document.getElementById('status-group');

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

document.getElementById('add-customer-btn')?.addEventListener('click', () => {
  custIdInput.value = '';
  customerForm.reset();
  modalTitle.textContent = 'Create Customer Account';
  custEmailInput.removeAttribute('disabled');
  passwordGroup.style.display = 'block';
  custPasswordInput.setAttribute('required', 'true');
  statusGroup.style.display = 'none';
  openModal(customerModal);
});

document.getElementById('close-modal')?.addEventListener('click', () => closeModal(customerModal));
document.getElementById('cancel-btn')?.addEventListener('click', () => closeModal(customerModal));

function renderTable() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const st = statusFilter.value;

  const filtered = customersState.filter(c => {
    if (st === 'active' && !c.is_active) return false;
    if (st === 'inactive' && c.is_active) return false;
    if (q) {
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
    }
    return true;
  });

  const totalEl = document.getElementById('kpi-cust-total');
  const activeEl = document.getElementById('kpi-cust-subscribed');
  if (totalEl) totalEl.textContent = String(customersState.length);
  if (activeEl) activeEl.textContent = String(customersState.filter(c => c.is_active).length);

  customersCounter.textContent = `Showing ${filtered.length} of ${customersState.length} customers`;

  if (!filtered.length) {
    customersTbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 0;">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <div class="empty-state-title">No Customers Found</div>
            <div class="empty-state-desc">There are no customer profiles matching your search criteria.</div>
            <button class="btn btn-primary btn-sm" id="empty-add-customer-btn">+ Add Customer</button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('empty-add-customer-btn')?.addEventListener('click', () => {
      document.getElementById('add-customer-btn')?.click();
    });
    return;
  }

  customersTbody.innerHTML = filtered.map(c => {
    return `
      <tr>
        <td style="font-weight: var(--font-semibold);">${c.name}</td>
        <td><a href="mailto:${c.email}" style="color: var(--color-primary);">${c.email}</a></td>
        <td class="text-muted text-sm">${c.phone || 'N/A'}</td>
        <td><span class="badge badge-muted">${c.role}</span></td>
        <td>
          <span class="badge ${c.is_active ? 'badge-success' : 'badge-danger'}">
            ${c.is_active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </td>
        <td class="text-muted text-sm">${formatDate(c.created_at)}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: var(--space-2);">
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${c.id}">Edit</button>
            <a href="/admin/subscriptions.html" class="btn btn-primary btn-sm">Subscribe</a>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  customersTbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const cust = customersState.find(x => x.id === id);
      if (cust) openEditModal(cust);
    });
  });
}

function openEditModal(c) {
  custIdInput.value = c.id;
  custNameInput.value = c.name;
  custEmailInput.value = c.email;
  custEmailInput.setAttribute('disabled', 'true');
  custPhoneInput.value = c.phone || '';
  custActiveInput.checked = c.is_active;

  passwordGroup.style.display = 'none';
  custPasswordInput.removeAttribute('required');
  statusGroup.style.display = 'block';

  modalTitle.textContent = `Edit Customer: ${c.name}`;
  openModal(customerModal);
}

customerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = custIdInput.value;
  if (!id) {
    const password = custPasswordInput.value;
    const v = validatePassword(password);
    if (!v.isValid) {
      showToast('Password does not meet complexity requirements', 'warning');
      return;
    }

    try {
      const payload = {
        name: custNameInput.value.trim(),
        email: custEmailInput.value.trim().toLowerCase(),
        password: password,
        phone: custPhoneInput.value.trim() || null,
        role: 'CUSTOMER'
      };
      await api.post('/api/users', payload);
      closeModal(customerModal);
      showToast('Customer created successfully', 'success');
      loadCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to create customer', 'danger');
    }
  } else {
    try {
      const payload = {
        name: custNameInput.value.trim(),
        phone: custPhoneInput.value.trim() || null,
        is_active: custActiveInput.checked
      };
      await api.put(`/api/users/${id}`, payload);
      closeModal(customerModal);
      showToast('Customer profile updated', 'success');
      loadCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to update customer', 'danger');
    }
  }
});

async function loadCustomers() {
  try {
    const res = await api.get('/api/users?role=CUSTOMER&size=100');
    customersState = res && Array.isArray(res.items) ? res.items : (Array.isArray(res) ? res : []);
    renderTable();
  } catch (err) {
    showToast(err.message || 'Failed to load customer directory', 'danger');
  }
}

searchInput?.addEventListener('input', renderTable);
statusFilter?.addEventListener('change', renderTable);

loadCustomers();
