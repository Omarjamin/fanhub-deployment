// pages/register-page.js

import RegisterformComponent from '../../../components/bini_components/auth/register-form.js';
import Layout from '../../../layouts/bini_layout/register.js';
import '../../../styles/bini_styles/register-form.css';

export default function Registerform() {
  const { formRegistration } = Layout(document.getElementById('app'));
  RegisterformComponent(formRegistration);
}
