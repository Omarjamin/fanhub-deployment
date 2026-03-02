import SettingsComponent from '../../components/Admin_components/Components/Settings.js';
import AdminDashboard from '../../layouts/Admin_layout/Admin-Dashboard.js';
export default function Settings() {
  
  const root = this.root;
  root.innerHTML = '';

  const layout = AdminDashboard(root);
  layout.main.innerHTML = '';
  layout.main.appendChild(SettingsComponent());
}
