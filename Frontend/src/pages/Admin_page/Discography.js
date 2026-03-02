import DiscographyComponent from '../../components/Admin_components/Components/Discography.js';
import AdminDashboard from '../../layouts/Admin_layout/Admin-Dashboard.js';

export default function Discography() {
  const root = this.root;
  root.innerHTML = '';

  const layout = AdminDashboard(root);
  layout.main.innerHTML = '';
  layout.main.appendChild(DiscographyComponent());
}
