import '../../../styles/Admin_styles/Payments.css';

export default function createPayments() {
  const section = document.createElement('section');
  section.id = 'payments';
  section.className = 'content-section active';

  section.innerHTML = `
    <div class="section-header">
      <h2>Payment Management</h2>
    </div>

    <div class="filters">
      <input 
        type="text" 
        placeholder="Search payments..." 
        class="filter-input" 
        id="paymentSearch"
      >

      <select class="filter-select" id="paymentStatusFilter">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="refunded">Refunded</option>
      </select>

      <select class="filter-select" id="paymentMethodFilter">
        <option value="">All Methods</option>
        <option value="credit_card">Credit Card</option>
        <option value="gcash">GCash</option>
        <option value="paymaya">Maya</option>
        <option value="bank_transfer">Bank Transfer</option>
      </select>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="paymentsTableBody"></tbody>
      </table>
    </div>
  `;


  const paymentsData = [
    { id: "#TXN-001", customer: "Miko", amount: "₱1,299", method: "GCash", status: "Completed", date: "2024-01-20" },
    { id: "#TXN-002", customer: "Aaron", amount: "₱2,499", method: "Digital Wallet", status: "Completed", date: "2024-01-19" },
    { id: "#TXN-003", customer: "Jamin", amount: "₱899", method: "COD", status: "Pending", date: "2024-01-18" },
  ];

  function loadPayments() {
    const tbody = section.querySelector("#paymentsTableBody");
    if (!tbody) return;

    tbody.innerHTML = paymentsData.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.customer}</td>
        <td>${p.amount}</td>
        <td>${p.method}</td>
        <td>
          <span class="badge badge-${p.status.toLowerCase()}">
            ${p.status}
          </span>
        </td>
        <td>${p.date}</td>
        <td>
          <button class="btn-icon" title="View">👁️</button>
          <button class="btn-icon" title="Refund">↩️</button>
          <button class="btn-icon" title="Receipt">📥</button>
        </td>
      </tr>
    `).join("");
  }

  function filterPayments() {
    const q = section.querySelector("#paymentSearch").value.toLowerCase();
    const method = section.querySelector("#paymentMethodFilter").value.toLowerCase();
    const status = section.querySelector("#paymentStatusFilter").value.toLowerCase();

    section.querySelectorAll("#paymentsTableBody tr").forEach(row => {
      const id = row.cells[0].textContent.toLowerCase();
      const name = row.cells[1].textContent.toLowerCase();
      const m = row.cells[3].textContent.toLowerCase();
      const st = row.cells[4].textContent.toLowerCase();

      const matchText = id.includes(q) || name.includes(q);
      const matchMethod = !method || m.includes(method);
      const matchStatus = !status || st.includes(status);

      row.style.display =
        matchText && matchMethod && matchStatus ? "" : "none";
    });
  }

  function setupPaymentFilters() {
    const search = section.querySelector("#paymentSearch");
    const method = section.querySelector("#paymentMethodFilter");
    const status = section.querySelector("#paymentStatusFilter");

    search.addEventListener("input", filterPayments);
    method.addEventListener("change", filterPayments);
    status.addEventListener("change", filterPayments);
  }

  function initPayments() {
    setupPaymentFilters();
    loadPayments();
  }

  initPayments();

  return section;
}
