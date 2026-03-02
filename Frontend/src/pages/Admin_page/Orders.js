import OrdersComponent from '../../components/Admin_components/Components/Orders.js';
import AdminDashboard from '../../layouts/Admin_layout/Admin-Dashboard.js';

export default function OrdersPage() {
  const root = this.root;
  root.innerHTML = '';

  const layout = AdminDashboard(root);
  layout.main.innerHTML = '';
  layout.main.appendChild(OrdersComponent())
}
