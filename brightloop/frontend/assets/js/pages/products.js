import { api } from '../api.js';
import { showToast, openModal, closeModal, formatCurrency } from '../ui.js';
import { enforceAuthGuard } from '/assets/js/guards.js';
import { logoutUser, fetchCurrentUserProfile } from '../auth.js';

enforceAuthGuard(['ADMIN', 'STAFF']);

let currentEditingId = null;
let currentVariantProductId = null;

async function loadProducts(page = 1, search = '') {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;"><div class="skeleton" style="height:24px;"></div></td></tr>`;

  try {
    const data = await api.get(`/products?page=${page}&size=20&search=${encodeURIComponent(search)}`);
    renderProductsTable(data.items);
  } catch (err) {
    showToast(err.message || 'Failed to load products', 'error');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--danger);">Error loading products.</td></tr>`;
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            <div class="empty-state-title">No products found</div>
            <div class="empty-state-desc">Create your first software or service product to start building plans and quotations.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const variantTags = (p.variants && p.variants.length > 0)
      ? p.variants.map(v => `<span class="badge badge-draft" style="font-size:0.7rem; margin-right:4px;">${v.attribute_name}:${v.attribute_value} (+${formatCurrency(v.extra_price)})</span>`).join('')
      : '<span class="text-muted" style="font-size:0.75rem;">None</span>';

    return `
      <tr>
        <td>
          <div style="font-weight:600; color:var(--maroon-900);">${p.name}</div>
          <div class="text-muted" style="font-size:0.78rem;">${p.notes || 'No description'}</div>
        </td>
        <td><span class="badge badge-quotation">${p.type}</span></td>
        <td><strong>${formatCurrency(p.sales_price)}</strong></td>
        <td><span class="text-muted">${formatCurrency(p.cost_price)}</span></td>
        <td>${variantTags}</td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm edit-product-btn" data-id="${p.id}">Edit</button>
            <button class="btn btn-secondary btn-sm manage-variants-btn" data-id="${p.id}" data-name="${p.name}">+ Variant</button>
            <button class="btn btn-secondary btn-sm delete-product-btn" data-id="${p.id}" style="color:var(--danger); border-color:#E8D0D3;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => editProduct(btn.dataset.id));
  });

  document.querySelectorAll('.manage-variants-btn').forEach(btn => {
    btn.addEventListener('click', () => openVariantModal(btn.dataset.id, btn.dataset.name));
  });

  document.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

async function editProduct(id) {
  try {
    const p = await api.get(`/products/${id}`);
    currentEditingId = p.id;
    document.getElementById('modal-product-title').textContent = 'Edit Product';
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-type').value = p.type;
    document.getElementById('product-sales-price').value = p.sales_price;
    document.getElementById('product-cost-price').value = p.cost_price;
    document.getElementById('product-notes').value = p.notes || '';
    document.getElementById('product-active').checked = p.is_active;
    openModal('product-modal');
  } catch (err) {
    showToast(err.message || 'Error fetching product', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    await api.delete(`/products/${id}`);
    showToast('Product deleted successfully', 'success');
    loadProducts();
  } catch (err) {
    showToast(err.message || 'Cannot delete product', 'error');
  }
}

function openVariantModal(productId, productName) {
  currentVariantProductId = productId;
  document.getElementById('variant-modal-product-name').textContent = productName;
  document.getElementById('variant-attr-name').value = 'Brand';
  document.getElementById('variant-attr-val').value = 'Odoo';
  document.getElementById('variant-extra-price').value = '560.00';
  openModal('variant-modal');
}

function setupEventHandlers() {
  const addBtn = document.getElementById('open-create-product-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      currentEditingId = null;
      document.getElementById('modal-product-title').textContent = 'Create Product';
      document.getElementById('product-form').reset();
      openModal('product-modal');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  document.getElementById('open-create-product-btn')?.addEventListener('click', () => {
    currentEditingId = null;
    document.getElementById('product-form')?.reset();
    document.getElementById('product-modal-title').textContent = 'Create New Product';
    openModal('product-modal');
  });

  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('product-name').value.trim(),
        type: document.getElementById('product-type').value,
        sales_price: parseFloat(document.getElementById('product-sales-price').value),
        cost_price: parseFloat(document.getElementById('product-cost-price').value || 0),
        notes: document.getElementById('product-notes').value.trim() || null,
        is_active: document.getElementById('product-active').checked
      };

      try {
        if (currentEditingId) {
          await api.put(`/products/${currentEditingId}`, payload);
          showToast('Product updated successfully', 'success');
        } else {
          await api.post('/products', payload);
          showToast('Product created successfully', 'success');
        }
        closeModal('product-modal');
        loadProducts();
      } catch (err) {
        showToast(err.message || 'Failed to save product', 'error');
      }
    });
  }

  const variantForm = document.getElementById('variant-form');
  if (variantForm) {
    variantForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentVariantProductId) return;

      const payload = {
        attribute_name: document.getElementById('variant-attr-name').value.trim(),
        attribute_value: document.getElementById('variant-attr-val').value.trim(),
        extra_price: parseFloat(document.getElementById('variant-extra-price').value || 0)
      };

      try {
        await api.post(`/products/${currentVariantProductId}/variants`, payload);
        showToast('Variant added successfully', 'success');
        closeModal('variant-modal');
        loadProducts();
      } catch (err) {
        showToast(err.message || 'Failed to add variant', 'error');
      }
    });
  }

  const searchInput = document.getElementById('search-products');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadProducts(1, searchInput.value);
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
  setupEventHandlers();
  loadProducts();
});
