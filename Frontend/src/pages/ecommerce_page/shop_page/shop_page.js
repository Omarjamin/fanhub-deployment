import Binishop_banner from '../../../components/ecommerce_components/banner/binishop-banner.js';
import Navigation from '../../../components/ecommerce_components/navigation.js';
import Collection from '../../../components/ecommerce_components/collection/collection.js';
import Footer from '../../../components/ecommerce_components/footer.js';
// import Product_collection from '../Components/product-collection';

import Layouts from '../../../layouts/ecommerce_layout/shop.js';

import '../../../styles/ecommerce_styles/global.css';
import '../../../styles/ecommerce_styles/shop.css';
import '../../../styles/ecommerce_styles/Collection.css';
import '../../../styles/ecommerce_styles/product_details.css';

export default function Home(data = {}) {
  const { navigation, main, footer} = Layouts(this.root);

  Navigation(navigation, data); 
  Binishop_banner(main, data);
  Collection(main, data);
  Footer(footer, data);
  // Product_collection(main);
  

  
};

