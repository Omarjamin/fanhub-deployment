import CommunityComponent from '../../components/Admin_components/Components/Community.js';
import AdminDashboard from '../../layouts/Admin_layout/Admin-Dashboard.js';

export default function Community() {
  const root = this.root;
  root.innerHTML = '';

  const layout = AdminDashboard(root);
  layout.main.innerHTML = '';
  layout.main.appendChild(CommunityComponent());
}


