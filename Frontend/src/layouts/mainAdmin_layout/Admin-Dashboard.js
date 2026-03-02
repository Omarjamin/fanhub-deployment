import Header from '../../components/mainAdmin_components/Header.js';
import Sidebar from '../../components/mainAdmin_components/Sidebar.js';

export default function AdminDashboard(root) {
  root.innerHTML = `
    <div id="container">
      <header id="head"></header>
      <nav id="navigation"></nav>
      <main id="main"></main>
      <footer id="footer"></footer>
    </div>
  `;

  const header = document.getElementById('head');
  const navigation = document.getElementById('navigation');
  const main = document.getElementById('main');
  const footer = document.getElementById('footer');

  Header(header);
  Sidebar(navigation);

  return { header, navigation, main, footer };
}
