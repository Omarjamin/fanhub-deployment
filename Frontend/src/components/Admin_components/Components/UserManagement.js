import '../../../styles/Admin_styles/UserManagement.css';
import { formatAdminDate } from './admin-date.js';
import { sanitizeAdminSearch } from '../../../utils/admin-form-validation.js';

export default function Users() {
  const section = document.createElement('section');
  section.id = 'users';
  section.className = 'content-section';

  section.innerHTML = `
  <div class="users-wrapper">
    <div class="user-management">

      <div class="section-header">
        <h2>User Management</h2>
        <button class="add-user-btn" id="addUserBtn">+ Add User</button>
      </div>

      <div class="user-filters">
        <input 
          type="text" 
          placeholder="Search users..." 
          class="search-users" 
          id="userSearch"
          maxlength="80"
        >
        <select class="status-filter" id="userStatusFilter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      <div class="table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersTableBody"></tbody>
        </table>
      </div>

    </div>
  </div>
`;



  const mockUsers = [
    { id: "#001", name: "Miko", email: "miko@email.com", status: "Active", date: "2024-01-15" },
    { id: "#002", name: "Aaron", email: "aaron@email.com", status: "Active", date: "2024-01-16" },
    { id: "#003", name: "Jamin", email: "jamin@email.com", status: "Inactive", date: "2024-01-17" },
  ];

  function loadUsers() {
    const usersTableBody = section.querySelector("#usersTableBody");
    usersTableBody.innerHTML = mockUsers.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>
          <span class="badge badge-${user.status.toLowerCase()}">
            ${user.status}
          </span>
        </td>
        <td>${formatAdminDate(user.date, user.date)}</td>
        <td>
          <button class="btn-icon">✏️</button>
          <button class="btn-icon">👁️</button>
          <button class="btn-icon btn-danger">🗑️</button>
        </td>
      </tr>
    `).join("");
  }

  function filterUsers() {
    const searchInput = section.querySelector("#userSearch");
    const sanitizedSearch = sanitizeAdminSearch(searchInput?.value || "", { maxLength: 80 });
    if (searchInput && searchInput.value !== sanitizedSearch) {
      searchInput.value = sanitizedSearch;
    }

    const search = sanitizedSearch.toLowerCase();
    const statusFilter = section.querySelector("#userStatusFilter").value.toLowerCase();

    section.querySelectorAll("#usersTableBody tr").forEach(row => {
      const name = row.cells[1].textContent.toLowerCase();
      const email = row.cells[2].textContent.toLowerCase();
      const status = row.cells[3].textContent.toLowerCase();

      const visible =
        (name.includes(search) || email.includes(search)) &&
        (!statusFilter || status.includes(statusFilter));

      row.style.display = visible ? "" : "none";
    });
  }

  function setupUserFilters() {
    section.querySelector("#userSearch").addEventListener("input", filterUsers);
    section.querySelector("#userStatusFilter").addEventListener("change", filterUsers);
  }

  setupUserFilters();
  loadUsers();

  return section;
}
