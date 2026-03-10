import Navigation from '../../../components/ecommerce_components/navigation.js';
import Banner from '../../../components/ecommerce_components/banner/banner.js';
import About from '../../../components/ecommerce_components/about/about.js';
import Discography from '../../../components/ecommerce_components/discography/discography.js';
import event_section from '../../../components/ecommerce_components/about/event.js';
import announcement from '../../../components/ecommerce_components/about/announcement.js'; 
import Footer from '../../../components/ecommerce_components/footer.js';
import Layouts from '../../../layouts/ecommerce_layout/default-home.js';

import '../../../styles/ecommerce_styles/home_page.css';
import '../../../styles/ecommerce_styles/global.css';
import '../../../styles/ecommerce_styles/banner.css';
import '../../../styles/ecommerce_styles/about.css';
import '../../../styles/ecommerce_styles/event.css'
import '../../../styles/ecommerce_styles/discography.css';
import '../../../styles/ecommerce_styles/announcement.css';

export default function HOMEPAGE(data = {}) {
  const { navigation, main, footer} = Layouts(this.root);
  Navigation(navigation, data); 
  Banner(main, data);
  About(main, data);
  Discography(main, data);
  event_section(main, data);
  announcement(main, data);
  Footer(footer, data);  
};

