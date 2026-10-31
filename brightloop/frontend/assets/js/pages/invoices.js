import { api } from '../api.js';
import { showToast, openModal, closeModal, formatCurrency, formatDate } from '../ui.js';
import { enforceAuthGuard } from '../guards.js';
import { logoutUser, fetchCurrentUserProfile } from '../auth.js';

enforceAuthGuard(['ADMIN', 'STAFF']);

let currentPayInvoiceId = null;
let currentPayOutstanding = 0;
let activeFilter = '';

async function loadInvoices(page = 1, search = '') {
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem;"><div class="skeleton" style="height:24px;"></div></td></tr>`;

  try {
    let url = `/invoices?page=${page}&size=20&search=${encodeURIComponent(search)}`;
    if (activeFilter === 'overdue') {
      url += `&is_overdue=true`;
    } else if (activeFilter) {
      url += `&status=${encodeURIComponent(activeFilter)}`;
    }

    const data = await api.get(url);
    renderInvoicesTable(data.items);
  } catch (err) {
    showToast(err.message || 'Failed to load invoices', 'error');
  }
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <div class="empty-state-title">No invoices found</div>
            <div class="empty-state-desc">Automated batch billing or on-demand generation creates customer invoices automatically.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = invoices.map(inv => {
    let badgeClass = 'badge-draft';
    if (inv.status === 'confirmed') badgeClass = 'badge-confirmed';
    else if (inv.status === 'paid') badgeClass = 'badge-paid';
    else if (inv.status === 'cancelled') badgeClass = 'badge-cancelled';

    const overdueBadge = inv.is_overdue
      ? '<span class="badge badge-overdue" style="font-size:0.68rem; margin-left:4px;">OVERDUE</span>'
      : '';

    const customerName = inv.customer ? inv.customer.name : `Customer #${inv.customer_id}`;
    const outstanding = inv.outstanding_balance !== undefined ? inv.outstanding_balance : (inv.total_amount - inv.amount_paid);

    return `
      <tr>
        <td><strong>${inv.invoice_number}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--maroon-900);">${customerName}</div>
          <div class="text-muted" style="font-size:0.75rem;">Due: ${formatDate(inv.due_date)}</div>
        </td>
        <td>
          <span class="badge ${badgeClass}"><span class="badge-dot"></span>${inv.status}</span>
          ${overdueBadge}
        </td>
        <td>${formatCurrency(inv.total_amount)}</td>
        <td><strong style="color:var(--success-ink);">${formatCurrency(inv.amount_paid)}</strong></td>
        <td><strong style="color:${outstanding > 0 ? 'var(--danger)' : 'var(--muted)'};">${formatCurrency(outstanding)}</strong></td>
        <td>
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm print-inv-btn" data-id="${inv.id}">Print</button>
            <button class="btn btn-secondary btn-sm send-inv-btn" data-id="${inv.id}">Send</button>
            ${inv.status !== 'paid' && inv.status !== 'cancelled' ? `
              <button class="btn btn-primary btn-sm pay-inv-btn" data-id="${inv.id}" data-number="${inv.invoice_number}" data-balance="${outstanding}">Pay</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.print-inv-btn').forEach(btn => {
    btn.addEventListener('click', () => openPrintView(btn.dataset.id));
  });

  document.querySelectorAll('.send-inv-btn').forEach(btn => {
    btn.addEventListener('click', () => sendInvoiceReminder(btn.dataset.id));
  });

  document.querySelectorAll('.pay-inv-btn').forEach(btn => {
    btn.addEventListener('click', () => openPaymentModal(btn.dataset.id, btn.dataset.number, btn.dataset.balance));
  });
}

async function openPrintView(id) {
  try {
    const inv = await api.get(`/invoices/${id}`);
    document.getElementById('print-number').textContent = inv.invoice_number;
    document.getElementById('print-date').textContent = formatDate(inv.issue_date);
    document.getElementById('print-due').textContent = formatDate(inv.due_date);
    document.getElementById('print-customer-name').textContent = inv.customer ? inv.customer.name : 'Customer';
    document.getElementById('print-customer-email').textContent = inv.customer ? inv.customer.email : '';
    document.getElementById('print-subtotal').textContent = formatCurrency(inv.subtotal);
    document.getElementById('print-discount').textContent = formatCurrency(inv.discount_amount);
    document.getElementById('print-tax').textContent = formatCurrency(inv.tax_amount);
    document.getElementById('print-total').textContent = formatCurrency(inv.total_amount);
    document.getElementById('print-paid').textContent = formatCurrency(inv.amount_paid);
    document.getElementById('print-balance').textContent = formatCurrency(inv.total_amount - inv.amount_paid);

    const linesBody = document.getElementById('print-lines-body');
    if (linesBody) {
      linesBody.innerHTML = (inv.lines && inv.lines.length > 0)
        ? inv.lines.map(l => `
          <tr>
            <td>
              <strong>${l.product ? l.product.name : 'Product #' + l.product_id}</strong>
              ${l.variant ? `<div class="text-muted" style="font-size:0.75rem;">${l.variant.attribute_name}: ${l.variant.attribute_value}</div>` : ''}
            </td>
            <td>${l.quantity}</td>
            <td>${formatCurrency(l.unit_price)}</td>
            <td>${formatCurrency(l.tax_amount)}</td>
            <td><strong>${formatCurrency(l.line_total)}</strong></td>
          </tr>
        `).join('')
        : '<tr><td colspan="5">No lines</td></tr>';
    }

    openModal('print-modal');
  } catch (err) {
    showToast(err.message || 'Error opening invoice', 'error');
  }
}

async function sendInvoiceReminder(id) {
  try {
    const res = await api.post(`/invoices/${id}/send`, {});
    showToast(res.message || 'Invoice dispatched successfully', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to dispatch invoice reminder', 'error');
  }
}

function openPaymentModal(id, number, balance) {
  currentPayInvoiceId = id;
  currentPayOutstanding = parseFloat(balance);
  document.getElementById('pay-modal-number').textContent = number;
  document.getElementById('pay-modal-balance').textContent = formatCurrency(balance);
  document.getElementById('payment-amount').value = balance;
  document.getElementById('payment-amount').max = balance;
  openModal('payment-modal');
}

function setupEventHandlers() {
  const runBillingBtn = document.getElementById('run-billing-btn');
  if (runBillingBtn) {
    runBillingBtn.addEventListener('click', async () => {
      runBillingBtn.disabled = true;
      runBillingBtn.textContent = 'Executing...';
      try {
        const summary = await api.post('/billing/run', {});
        document.getElementById('billing-created-count').textContent = summary.created;
        document.getElementById('billing-skipped-count').textContent = summary.skipped;
        document.getElementById('billing-failed-count').textContent = summary.failed;

        const detailsList = document.getElementById('billing-details-list');
        if (detailsList) {
          detailsList.innerHTML = summary.details.map(d => `<li>${d}</li>`).join('') || '<li>No cycles due for billing today.</li>';
        }

        openModal('billing-summary-modal');
        loadInvoices();
      } catch (err) {
        showToast(err.message || 'Automated billing failed', 'error');
      } finally {
        runBillingBtn.disabled = false;
        runBillingBtn.textContent = 'Run Automated Billing';
      }
    });
  }

  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('payment-amount').value);
      if (amount <= 0 || amount > currentPayOutstanding) {
        showToast(`Amount must be between $0.01 and $${currentPayOutstanding}`, 'error');
        return;
      }

      const payload = {
        invoice_id: parseInt(currentPayInvoiceId, 10),
        payment_method: document.getElementById('payment-method').value,
        amount: amount,
        transaction_reference: document.getElementById('payment-reference').value.trim() || null,
        notes: document.getElementById('payment-notes').value.trim() || null
      };

      try {
        await api.post('/payments', payload);
        showToast('Payment recorded successfully', 'success');
        closeModal('payment-modal');
        loadInvoices();
      } catch (err) {
        showToast(err.message || 'Payment failed', 'error');
      }
    });
  }

  const printTriggerBtn = document.getElementById('execute-print-btn');
  if (printTriggerBtn) {
    printTriggerBtn.addEventListener('click', () => {
      window.print();
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  document.querySelectorAll('.invoice-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.invoice-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      loadInvoices();
    });
  });

  const searchInput = document.getElementById('search-invoices');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadInvoices(1, searchInput.value);
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
  loadInvoices();
});
