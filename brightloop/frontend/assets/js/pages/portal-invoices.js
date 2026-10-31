import { requireRole } from '/assets/js/guards.js';
import { api } from '/assets/js/api.js';
import { showToast, openModal, closeModal, formatCurrency, formatDate } from '/assets/js/ui.js';
import { initPortalLayout } from '/assets/js/layout.js';

requireRole(['CUSTOMER', 'ADMIN', 'STAFF']);
initPortalLayout();

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

document.getElementById('close-receipt-modal')?.addEventListener('click', () => closeModal(receiptModal));
document.getElementById('close-receipt-btn')?.addEventListener('click', () => closeModal(receiptModal));
printReceiptBtn?.addEventListener('click', () => window.print());

document.getElementById('close-pay-modal')?.addEventListener('click', () => closeModal(payModal));
document.getElementById('cancel-pay-btn')?.addEventListener('click', () => closeModal(payModal));

function renderStatusBadge(inv) {
  const st = (inv.status || '').toLowerCase();
  if (st === 'paid') {
    return `<span class="badge badge-success"><span class="badge-dot"></span>PAID</span>`;
  }
  if (inv.is_overdue) {
    return `<span class="badge badge-danger"><span class="badge-dot"></span>OVERDUE</span>`;
  }
  if (st === 'confirmed') {
    return `<span class="badge badge-confirmed"><span class="badge-dot"></span>CONFIRMED</span>`;
  }
  return `<span class="badge badge-muted">${st.toUpperCase()}</span>`;
}

function renderTable() {
  const q = (searchInput?.value || '').trim().toLowerCase();
  const st = (statusFilter?.value || '').toLowerCase();

  const filtered = invoicesState.filter(inv => {
    if (st && (inv.status || '').toLowerCase() !== st) return false;
    if (q) {
      const num = (inv.invoice_number || '').toLowerCase();
      if (!num.includes(q)) return false;
    }
    return true;
  });

  if (invoicesCounter) {
    invoicesCounter.textContent = `Showing ${filtered.length} of ${invoicesState.length} invoices`;
  }

  if (!filtered.length) {
    if (invoicesTbody) {
      invoicesTbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center" style="padding: 3.5rem 1.5rem;" id="invoices-empty-state">
            <div style="max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--cream-100); display: flex; align-items: center; justify-content: center; color: var(--maroon-700);">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              </div>
              <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--maroon-900); margin: 0;">No invoices available</h3>
              <p class="text-muted text-sm" style="margin: 0; line-height: 1.5;">There are no invoices matching your current selection.</p>
            </div>
          </td>
        </tr>
      `;
    }
    return;
  }

  if (invoicesTbody) {
    invoicesTbody.innerHTML = filtered.map(inv => {
      const bal = parseFloat(inv.outstanding_balance) || 0;
      return `
        <tr>
          <td class="font-mono text-sm" style="font-weight: 600; color: var(--maroon-900);">${inv.invoice_number}</td>
          <td class="text-xs text-muted">${formatDate(inv.period_start)} &ndash; ${formatDate(inv.period_end)}</td>
          <td class="text-sm">${formatDate(inv.issue_date)}</td>
          <td class="text-sm ${inv.is_overdue ? 'text-danger font-semibold' : ''}">${formatDate(inv.due_date)}</td>
          <td class="text-right" style="font-weight: 600;">${formatCurrency(inv.total_amount)}</td>
          <td class="text-right" style="color: var(--success); font-weight: 600;">${formatCurrency(inv.amount_paid)}</td>
          <td class="text-right" style="font-weight: 700; color: ${bal > 0 ? 'var(--warn)' : 'var(--muted)'};">${formatCurrency(bal)}</td>
          <td>${renderStatusBadge(inv)}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 0.5rem; justify-content: flex-end;">
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
        showReceipt(id);
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
}

async function showReceipt(invoiceId) {
  try {
    const inv = await api.get(`/invoices/${invoiceId}`);
    if (!inv) return;

    const linesHtml = (inv.lines || []).map(line => `
      <tr>
        <td style="padding: 0.65rem 0; border-bottom: 1px solid var(--cream-100);">${line.product ? line.product.name : 'Subscription Service'} ${line.variant ? `(${line.variant.attribute_value})` : ''}</td>
        <td style="padding: 0.65rem 0; text-align: center; border-bottom: 1px solid var(--cream-100);">${line.quantity}</td>
        <td style="padding: 0.65rem 0; text-align: right; border-bottom: 1px solid var(--cream-100);">${formatCurrency(line.unit_price)}</td>
        <td style="padding: 0.65rem 0; text-align: right; border-bottom: 1px solid var(--cream-100); font-weight: 600;">${formatCurrency(line.line_total || (line.unit_price * line.quantity))}</td>
      </tr>
    `).join('');

    receiptContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 2px solid var(--maroon-800); padding-bottom: 1rem;">
        <div>
          <div style="font-size: 1.4rem; font-weight: 700; color: var(--maroon-900); font-family: var(--font-display);">Brightloop Software</div>
          <div class="text-xs text-muted">Subscription Lifecycle Management</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-family: var(--font-mono); font-size: 1.1rem; color: var(--maroon-900);">${inv.invoice_number}</div>
          <div class="text-xs text-muted">Issued: ${formatDate(inv.issue_date)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.88rem;">
        <div>
          <div class="text-xs text-muted" style="text-transform: uppercase;">Billed To:</div>
          <div style="font-weight: 600;">${inv.customer ? inv.customer.name : 'Valued Customer'}</div>
          <div class="text-xs text-muted">${inv.customer ? inv.customer.email : ''}</div>
        </div>
        <div style="text-align: right;">
          <div class="text-xs text-muted" style="text-transform: uppercase;">Payment Status:</div>
          <div style="font-weight: 700; text-transform: uppercase; color: ${inv.status === 'paid' ? 'var(--success)' : 'var(--warn)'};">${inv.status}</div>
          <div class="text-xs text-muted">Due: ${formatDate(inv.due_date)}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-bottom: 1.5rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); font-size: 0.75rem; text-transform: uppercase; color: var(--muted);">
            <th style="text-align: left; padding-bottom: 0.5rem;">Description</th>
            <th style="text-align: center; padding-bottom: 0.5rem;">Qty</th>
            <th style="text-align: right; padding-bottom: 0.5rem;">Unit Price</th>
            <th style="text-align: right; padding-bottom: 0.5rem;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; font-size: 0.9rem;">
        <div style="width: 240px; display: flex; flex-direction: column; gap: 0.35rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Subtotal:</span>
            <span>${formatCurrency(inv.subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Tax:</span>
            <span>${formatCurrency(inv.tax_amount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.05rem; border-top: 1px solid var(--border); padding-top: 0.5rem; color: var(--maroon-900);">
            <span>Total:</span>
            <span>${formatCurrency(inv.total_amount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: var(--success); font-weight: 600;">
            <span>Amount Paid:</span>
            <span>${formatCurrency(inv.amount_paid)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: ${inv.total_amount - inv.amount_paid > 0 ? 'var(--warn)' : 'var(--muted)'};">
            <span>Balance Due:</span>
            <span>${formatCurrency(Math.max(0, inv.total_amount - inv.amount_paid))}</span>
          </div>
        </div>
      </div>
    `;

    openModal(receiptModal);
  } catch (err) {
    showToast(err.message || 'Failed to load receipt details', 'danger');
  }
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

    await api.post('/payments', payload);
    closeModal(payModal);
    showToast('Payment completed successfully!', 'success');
    loadInvoices();
  } catch (err) {
    showToast(err.message || 'Payment processing failed', 'danger');
  }
});

async function loadInvoices() {
  try {
    const list = await api.get('/portal/invoices');
    invoicesState = Array.isArray(list) ? list : [];
    renderTable();
  } catch (err) {
    showToast(err.message || 'Failed to load invoices', 'danger');
  }
}

searchInput?.addEventListener('input', renderTable);
statusFilter?.addEventListener('change', renderTable);

loadInvoices();
