import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, openModal, closeModal, formatCurrency, formatDate } from '/assets/js/ui.js';

requireRole(['CUSTOMER', 'ADMIN', 'STAFF']);

let invoicesState = [];

const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const invoicesTbody = document.getElementById('portal-invoices-tbody');
const invoicesCounter = document.getElementById('invoices-counter');

const receiptModal = document.getElementById('receipt-modal');
const receiptContent = document.getElementById('receipt-content');
const printReceiptBtn = document.getElementById('print-receipt-btn');

const payModal = document.getElementById('pay-modal');
const payForm = document.getElementById('pay-form');
const payInvoiceId = document.getElementById('pay-invoice-id');
const payBalanceDisplay = document.getElementById('pay-balance-display');
const payAmountInput = document.getElementById('pay-amount');
const payMethodSelect = document.getElementById('pay-method');

const userStr = localStorage.getItem('user');
if (userStr) {
  try {
    const u = JSON.parse(userStr);
    document.getElementById('customer-name-display').textContent = u.name || 'Customer';
    document.getElementById('customer-email-display').textContent = u.email || '';
  } catch (_) {}
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

document.getElementById('close-receipt-modal')?.addEventListener('click', () => closeModal(receiptModal));
document.getElementById('close-receipt-btn')?.addEventListener('click', () => closeModal(receiptModal));
printReceiptBtn?.addEventListener('click', () => window.print());

document.getElementById('close-pay-modal')?.addEventListener('click', () => closeModal(payModal));
document.getElementById('cancel-pay-btn')?.addEventListener('click', () => closeModal(payModal));

function renderStatusBadge(inv) {
  if (inv.status === 'paid') {
    return `<span class="badge badge-success">PAID</span>`;
  }
  if (inv.is_overdue) {
    return `<span class="badge badge-danger">OVERDUE</span>`;
  }
  return `<span class="badge badge-warning">${inv.status.toUpperCase()}</span>`;
}

function renderTable() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const st = statusFilter.value.toLowerCase();

  const filtered = invoicesState.filter(inv => {
    if (st && (inv.status || '').toLowerCase() !== st) return false;
    if (q) {
      const num = (inv.invoice_number || '').toLowerCase();
      if (!num.includes(q)) return false;
    }
    return true;
  });

  invoicesCounter.textContent = `Showing ${filtered.length} of ${invoicesState.length} invoices`;

  if (!filtered.length) {
    invoicesTbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: var(--space-8);">No billing records found.</td></tr>`;
    return;
  }

  invoicesTbody.innerHTML = filtered.map(inv => {
    const bal = parseFloat(inv.outstanding_balance) || 0;
    return `
      <tr>
        <td style="font-family: monospace; font-weight: var(--font-semibold); color: var(--color-primary);">${inv.invoice_number}</td>
        <td class="text-xs text-muted">${formatDate(inv.period_start)} &ndash; ${formatDate(inv.period_end)}</td>
        <td class="text-sm">${formatDate(inv.issue_date)}</td>
        <td class="text-sm ${inv.is_overdue ? 'text-danger' : ''}">${formatDate(inv.due_date)}</td>
        <td style="font-weight: var(--font-semibold);">${formatCurrency(inv.total_amount)}</td>
        <td style="color: var(--color-success); font-weight: var(--font-medium);">${formatCurrency(inv.amount_paid)}</td>
        <td style="font-weight: var(--font-bold); color: ${bal > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)'};">${formatCurrency(bal)}</td>
        <td>${renderStatusBadge(inv)}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: var(--space-2);">
            <button class="btn btn-secondary btn-sm receipt-btn" data-id="${inv.id}">Receipt</button>
            ${bal > 0 ? `<button class="btn btn-primary btn-sm pay-btn" data-id="${inv.id}" data-balance="${bal}">Pay</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  invoicesTbody.querySelectorAll('.receipt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const item = invoicesState.find(x => x.id === id);
      if (item) showReceiptModal(item);
    });
  });

  invoicesTbody.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const bal = parseFloat(btn.dataset.balance);
      openPaymentDialog(id, bal);
    });
  });
}

function showReceiptModal(inv) {
  document.getElementById('receipt-title').textContent = `Receipt ${inv.invoice_number}`;

  const linesHtml = (inv.lines || []).map(l => {
    const pName = l.product ? l.product.name : 'Subscription Service';
    const vName = l.variant ? ` (${l.variant.name})` : '';
    return `
      <tr>
        <td>${pName}${vName}</td>
        <td style="text-align: center;">${l.quantity}</td>
        <td style="text-align: right;">${formatCurrency(l.unit_price)}</td>
        <td style="text-align: right;">${formatCurrency(l.tax_amount)}</td>
        <td style="text-align: right; font-weight: var(--font-semibold);">${formatCurrency(l.line_total)}</td>
      </tr>
    `;
  }).join('');

  receiptContent.innerHTML = `
    <div style="padding: var(--space-2);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-6); border-bottom: 2px solid var(--color-border); padding-bottom: var(--space-4);">
        <div>
          <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px;">
            <div class="brand-icon" style="width: 24px; height: 24px; font-size: 14px;">B</div>
            <strong style="font-size: var(--text-lg);">Brightloop Software</strong>
          </div>
          <div class="text-xs text-muted">100 Tech Park Way, Silicon Valley, CA</div>
          <div class="text-xs text-muted">Tax ID: US-948201948</div>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0; color: var(--color-primary);">${inv.invoice_number}</h2>
          <div class="text-xs text-muted">Date: ${formatDate(inv.issue_date)}</div>
          <div class="text-xs text-muted">Due Date: ${formatDate(inv.due_date)}</div>
        </div>
      </div>

      <table class="table" style="margin-bottom: var(--space-6);">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Tax</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml || `<tr><td colspan="5" class="text-center text-muted">Subscription Recurring Period</td></tr>`}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 260px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1); font-size: var(--text-sm);">
            <span>Subtotal:</span>
            <span>${formatCurrency(inv.subtotal)}</span>
          </div>
          ${parseFloat(inv.discount_amount) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1); font-size: var(--text-sm); color: var(--color-success);">
              <span>Discount:</span>
              <span>-${formatCurrency(inv.discount_amount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1); font-size: var(--text-sm);">
            <span>Tax:</span>
            <span>${formatCurrency(inv.tax_amount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: var(--space-2); padding-top: var(--space-2); border-top: 2px solid var(--color-border); font-size: var(--text-base); font-weight: var(--font-bold);">
            <span>Total:</span>
            <span>${formatCurrency(inv.total_amount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: var(--space-1); font-size: var(--text-sm); color: var(--color-success);">
            <span>Paid:</span>
            <span>${formatCurrency(inv.amount_paid)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: var(--space-1); font-size: var(--text-base); font-weight: var(--font-bold); color: var(--color-primary);">
            <span>Balance Due:</span>
            <span>${formatCurrency(inv.outstanding_balance)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  openModal(receiptModal);
}

function openPaymentDialog(invId, balance) {
  payInvoiceId.value = invId;
  payBalanceDisplay.textContent = formatCurrency(balance);
  payAmountInput.value = balance.toFixed(2);
  payAmountInput.max = balance.toFixed(2);
  openModal(payModal);
}

payForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const invId = parseInt(payInvoiceId.value, 10);
  const amt = parseFloat(payAmountInput.value);
  const method = payMethodSelect.value;

  if (isNaN(amt) || amt <= 0) {
    showToast('Please specify a valid payment amount', 'warning');
    return;
  }

  try {
    const payload = {
      invoice_id: invId,
      amount: amt,
      payment_method: method,
      transaction_reference: `PORTAL-TX-${Date.now()}`,
      notes: 'Payment settled via customer self-service portal'
    };

    await api.post('/api/payments', payload);
    closeModal(payModal);
    showToast('Payment completed successfully!', 'success');
    loadInvoices();
  } catch (err) {
    showToast(err.message || 'Payment processing failed', 'danger');
  }
});

async function loadInvoices() {
  try {
    const list = await api.get('/api/portal/invoices');
    invoicesState = Array.isArray(list) ? list : [];
    renderTable();
  } catch (err) {
    showToast(err.message || 'Failed to load invoices', 'danger');
  }
}

searchInput?.addEventListener('input', renderTable);
statusFilter?.addEventListener('change', renderTable);

loadInvoices();
