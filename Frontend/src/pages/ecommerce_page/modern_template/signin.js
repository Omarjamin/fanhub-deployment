import BaseSignin from '../auth_page/signin_page.js';
import { applyModernTemplateShell } from '../../../lib/modern-template-shell.js';
import '../../../styles/ecommerce_styles/modern-template.css';

export default function ModernSignin(data = {}) {
  applyModernTemplateShell(this.root, 'signin');
  return BaseSignin.call(this, data);
}

