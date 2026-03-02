import LoginformComponent from '../../../components/bini_components/auth/login-form.js';
import Layout from '../../../layouts/bini_layout/login.js';
import '../../../styles/bini_styles/login.css';
  

export default function Loginform() {
  const { main, footer } = Layout(document.getElementById('app'));
  LoginformComponent(main);
  ;
}
