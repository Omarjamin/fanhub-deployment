import BaseSignup from '../auth_page/signup_page.js';
import { applyModernTemplateShell } from '../../../lib/modern-template-shell.js';
import '../../../styles/ecommerce_styles/modern-template.css';

export default function ModernSignup(data = {}) {
  applyModernTemplateShell(this.root, 'signup');
  return BaseSignup.call(this, data);
}

