import Navigation from '../../../components/bini_components/navigation.js';
import Layout from '../../../layouts/bini_layout/default.js';

export default function PageNotFound() {
  const { navigation, main } = Layout(this.root, data);

  main.innerHTML = '<h1 style="text-align: center">Page Not Found</h1>';
}
