import createPayments from '../../components/Admin_components/Components/Payments.js';

export default function PaymentsPage() {
  const root = this.root;
  root.innerHTML = '';

  const payments = createPayments();
  root.appendChild(payments);
}
