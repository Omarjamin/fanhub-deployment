import MarketplaceComponent from '../../components/Admin_components/Components/Marketplace.js';
import AdminDashboard from '../../layouts/Admin_layout/Admin-Dashboard.js';

export default function Marketplace() {
  const root = this.root;
  root.innerHTML = '';

  
  const layout = AdminDashboard(root);
  layout.main.innerHTML = '';
  layout.main.appendChild(MarketplaceComponent());
}

