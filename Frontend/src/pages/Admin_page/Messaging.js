import MessagingComponent from '../../components/Admin_components/Components/Messaging.js';

export default function Messaging() {
  const root = this.root;
  root.innerHTML = '';

  const messaging = MessagingComponent();
  root.appendChild(messaging);
}
