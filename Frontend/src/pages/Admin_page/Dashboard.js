import AdminDashboard from "../../layouts/Admin_layout/Admin-Dashboard.js";
import "../../styles/Admin_styles/Dashboard.css";
import DashboardComponent from "../../components/Admin_components/Components/Dashboard.js";

export default function Dashboard() {
  const root = this.root;

  const adminToken = String(sessionStorage.getItem('adminAuthToken') || '').trim();
  if (!adminToken) {
    window.location.href = '/subadmin/login';
    return;
  }

  root.innerHTML = "";

  // Setup layout and get main content area
  const layout = AdminDashboard(root);
  // Clear main content area and render dashboard
  layout.main.innerHTML = "";
  layout.main.appendChild(DashboardComponent());
}
