import Navigation from '../../../components/ecommerce_components/navigation.js';
import LeadImage from '../../../components/ecommerce_components/lead_image.js';
import Banner from '../../../components/ecommerce_components/banner/banner.js';
import About from '../../../components/ecommerce_components/about/about.js';
import Discography from '../../../components/ecommerce_components/discography/discography.js';
import event_section from '../../../components/ecommerce_components/about/event.js';
import announcement from '../../../components/ecommerce_components/about/announcement.js'; 
import Footer from '../../../components/ecommerce_components/footer.js';
import Layouts from '../../../layouts/ecommerce_layout/default-home.js';

import '../../../styles/ecommerce_styles/home_page.css';
import '../../../styles/ecommerce_styles/global.css';
import '../../../styles/ecommerce_styles/lead_image.css';
import '../../../styles/ecommerce_styles/banner.css';
import '../../../styles/ecommerce_styles/about.css';
import '../../../styles/ecommerce_styles/event.css'
import '../../../styles/ecommerce_styles/discography.css';
import '../../../styles/ecommerce_styles/announcement.css';

export default function HOMEPAGE(data = {}) {
  document.body.classList.add('ec-home-page');
  const { navigation, main, footer} = Layouts(this.root);
  console.info('[Home Page Debug] render data payload', data);
  Navigation(navigation, data);
  LeadImage(main, data);
  Banner(main, data);
  About(main, data);
  Discography(main, data);
  event_section(main, data);
  announcement(main, data);
  Footer(footer, data);  
};

