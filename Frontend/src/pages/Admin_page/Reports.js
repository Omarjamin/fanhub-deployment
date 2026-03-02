import ReportsComponent from '../../components/Admin_components/Components/Reports.js';
import AdminDashboard from '../../layouts/Admin_layout/Admin-Dashboard.js';

export default function Reports() {
  const root = this.root;
  root.innerHTML = '';

  // Setup layout and get main content area
  const layout = AdminDashboard(root);
  // Clear main content area and render reports
  layout.main.innerHTML = '';
  layout.main.appendChild(ReportsComponent());
}
