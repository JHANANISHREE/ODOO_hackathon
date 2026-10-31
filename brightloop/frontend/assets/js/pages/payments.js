import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, openModal, closeModal, formatCurrency, formatDate } from '/assets/js/ui.js';

requireRole(['ADMIN', 'STAFF']);

let paymentsState = [];

const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const methodFilter = document.getElementById('method-filter');
const paymentsTbody = document.getElementById('payments-tbody');
const paymentsCounter = document.getElementById('payments-counter');
const detailModal = document.getElementById('payment-detail-modal');
const detailContent = document.getElementById('detail-content');

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

document.getElementById('close-detail-modal')?.addEventListener('click', () => closeModal(detailModal));
document.getElementById('close-detail-btn')?.addEventListener('click', () => closeModal(detailModal));

function computeKPIs(list) {
  let paidSum = 0;
  let paidCount = 0;

  for (const p of list) {
    const amt = parseFloat(p.amount) || 0;
    paidSum += amt;
    paidCount += 1;
  }

  document.getElementById('kpi-total-paid').textContent = formatCurrency(paidSum);
  document.getElementById('kpi-count-paid').textContent = `${paidCount} payments recorded`;
  document.getElementById('kpi-total-pending').textContent = '$0.00';
  document.getElementById('kpi-count-pending').textContent = '0 unallocated';
  document.getElementById('kpi-total-failed').textContent = '$0.00';
  document.getElementById('kpi-count-failed').textContent = '0 rejected';
}

function renderTable() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const mt = methodFilter.value.toLowerCase();

  const filtered = paymentsState.filter(p => {
    if (mt && (p.payment_method || '').toLowerCase() !== mt) return false;
    if (q) {
      const ref = (p.transaction_reference || '').toLowerCase();
      const inv = (p.invoice_number || '').toLowerCase();
      const cust = (p.customer_name || '').toLowerCase();
      const idStr = String(p.id);
      if (!ref.includes(q) && !inv.includes(q) && !cust.includes(q) && !idStr.includes(q)) {
        return false;
      }
    }
    return true;
  });

  paymentsCounter.textContent = `Showing ${filtered.length} of ${paymentsState.length} payments`;

  if (!filtered.length) {
    paymentsTbody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 0;">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <div class="empty-state-title">No Payments Recorded</div>
            <div class="empty-state-desc">There are no payment transactions matching your search criteria or filters.</div>
            <a href="/admin/invoices.html" class="btn btn-primary btn-sm">Record Payment via Invoice</a>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  paymentsTbody.innerHTML = filtered.map(p => {
    const refCode = p.transaction_reference || ('PAY-' + String(p.id).padStart(5, '0'));
    const invCode = p.invoice_number || ('INV #' + p.invoice_id);
    return `
      <tr>
        <td style="font-family: monospace; font-weight: var(--font-semibold); color: var(--color-primary);">${refCode}</td>
        <td>
          <a href="/admin/invoices.html" style="font-family: monospace; text-decoration: underline;">${invCode}</a>
        </td>
        <td>
          <div style="font-weight: var(--font-medium);">${p.customer_name || 'Valued Customer'}</div>
        </td>
        <td style="font-weight: var(--font-semibold); color: var(--color-success);">${formatCurrency(p.amount)}</td>
        <td>
          <span class="badge badge-muted">${(p.payment_method || '').toUpperCase().replace('_', ' ')}</span>
        </td>
        <td><span class="badge badge-success">COMPLETED</span></td>
        <td class="text-muted text-sm">${formatDate(p.payment_date || p.created_at)}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm view-btn" data-id="${p.id}">View</button>
        </td>
      </tr>
    `;
  }).join('');

  paymentsTbody.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const item = paymentsState.find(x => x.id === id);
      if (item) showPaymentDetail(item);
    });
  });
}

function showPaymentDetail(item) {
  const refCode = item.transaction_reference || ('PAY-' + String(item.id).padStart(5, '0'));
  const invCode = item.invoice_number || ('INV #' + item.invoice_id);

  document.getElementById('detail-title').textContent = `Payment ${refCode}`;
  detailContent.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);">
      <div>
        <label class="text-xs text-muted">Transaction Reference</label>
        <div style="font-family: monospace; font-weight: var(--font-semibold);">${refCode}</div>
      </div>
      <div>
        <label class="text-xs text-muted">Invoice</label>
        <div style="font-family: monospace;">${invCode}</div>
      </div>
      <div>
        <label class="text-xs text-muted">Amount Paid</label>
        <div style="font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-success);">${formatCurrency(item.amount)}</div>
      </div>
      <div>
        <label class="text-xs text-muted">Status</label>
        <div><span class="badge badge-success">COMPLETED</span></div>
      </div>
      <div>
        <label class="text-xs text-muted">Payment Method</label>
        <div>${(item.payment_method || '').toUpperCase().replace('_', ' ')}</div>
      </div>
      <div>
        <label class="text-xs text-muted">Customer</label>
        <div style="font-weight: var(--font-medium);">${item.customer_name || 'Customer'}</div>
      </div>
      <div>
        <label class="text-xs text-muted">Settlement Date</label>
        <div class="text-sm">${formatDate(item.payment_date || item.created_at)}</div>
      </div>
    </div>
    ${item.notes ? `
      <div style="background: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-top: var(--space-3);">
        <label class="text-xs text-muted">Notes</label>
        <div class="text-sm">${item.notes}</div>
      </div>
    ` : ''}
  `;
  openModal(detailModal);
}

async function loadPayments() {
  try {
    const res = await api.get('/api/payments');
    paymentsState = res && Array.isArray(res.items) ? res.items : (Array.isArray(res) ? res : []);
    computeKPIs(paymentsState);
    renderTable();
  } catch (err) {
    showToast(err.message || 'Failed to load payments', 'danger');
  }
}

searchInput?.addEventListener('input', renderTable);
statusFilter?.addEventListener('change', renderTable);
methodFilter?.addEventListener('change', renderTable);

loadPayments();
