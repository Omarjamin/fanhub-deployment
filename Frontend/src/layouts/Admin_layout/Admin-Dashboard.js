import '../../styles/Admin_styles/Layout.css';
import Header from '../../components/Admin_components/Components/Header.js';
import Sidebar from '../../components/Admin_components/Components/Sidebar.js';


export default function AdminDashboard(root) {
  root.classList.add('admin-shell-root');
  root.innerHTML = `
    <div class="admin-shell">
      <header class="admin-shell__header"></header>
      <nav class="admin-shell__sidebar"></nav>
      <main class="admin-shell__main"></main>
      <footer class="admin-shell__footer"></footer>
    </div>
  `;

  const header = root.querySelector('.admin-shell__header');
  const navigation = root.querySelector('.admin-shell__sidebar');
  const main = root.querySelector('.admin-shell__main');
  const footer = root.querySelector('.admin-shell__footer');

  Header(header);
  Sidebar(navigation);


  return { header, navigation, main, footer };
}
