import '../../styles/Admin_styles/UserManagement.css';

export default function Users() {
  const root = this.root; 

  root.innerHTML = '';

  const section = document.createElement('section');
  section.id = 'users';
  section.className = 'content-section active';

  section.innerHTML = `
    <div class="user-management">
      <div class="section-header">
        <h2>User Management</h2>
      </div>

      <div class="user-filters">
        <input
          type="text"
          class="search-users"
          placeholder="Search users..."
        />

        <select class="status-filter">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button class="add-user-btn">
          <span>＋</span>
          <span>Add User</span>
        </button>
      </div>

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
        <tbody>
          <tr>
            <td>#001</td>
            <td>Miko</td>
            <td>miko@email.com</td>
            <td>
              <span class="status-badge status-active">Active</span>
            </td>
            <td>2024-01-15</td>
            <td>
              <div class="action-buttons">
                <button class="action-btn" title="Edit">✏️</button>
                <button class="action-btn" title="View">👁️</button>
                <button class="action-btn delete" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
          <tr>
            <td>#002</td>
            <td>Aaron</td>
            <td>aaron@email.com</td>
            <td>
              <span class="status-badge status-active">Active</span>
            </td>
            <td>2024-01-16</td>
            <td>
              <div class="action-buttons">
                <button class="action-btn" title="Edit">✏️</button>
                <button class="action-btn" title="View">👁️</button>
                <button class="action-btn delete" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
          <tr>
            <td>#003</td>
            <td>Jamin</td>
            <td>jamin@email.com</td>
            <td>
              <span class="status-badge status-inactive">Inactive</span>
            </td>
            <td>2024-01-17</td>
            <td>
              <div class="action-buttons">
                <button class="action-btn" title="Edit">✏️</button>
                <button class="action-btn" title="View">👁️</button>
                <button class="action-btn delete" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  root.appendChild(section);
}