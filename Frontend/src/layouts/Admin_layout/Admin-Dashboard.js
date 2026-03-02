import Header from '../../components/Admin_components/Components/Header.js';
import Sidebar from '../../components/Admin_components/Components/Sidebar.js';


export default function AdminDashboard(root) {
  root.innerHTML = `
    <div id="container">
      <header id="head"></header>
      <nav id="navigation"></nav>
      <main id="main"></main>
      <footer id="footer"></footer>
      
    </div>
  `;

  const header = root.querySelector('#head');
  const navigation = root.querySelector('#navigation');
  const main = root.querySelector('#main');
  const footer = root.querySelector('#footer');

  Header(header);
  Sidebar(navigation);


  return { header, navigation, main, footer };
}
