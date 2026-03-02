import AdminDashboard from '../../layouts/Admin_layout/Admin-Dashboard.js';
import '../../styles/Admin_styles/GenerateWebsite.css';
import GenerateWebsiteComponent from '../../components/Admin_components/Components/GenerateWebsite.js';

export default function GenerateWebsite() {
  const root = this.root;
  root.innerHTML = '';

  const layout = AdminDashboard(root);
  layout.main.innerHTML = '';
  layout.main.appendChild(GenerateWebsiteComponent());
}
