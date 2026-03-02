
import Navigation from '../../../components/ecommerce_components/navigation.js';
import Singup from '../../../components/ecommerce_components/auth/signup.js';


import Layouts from '../../../layouts/ecommerce_layout/signin_signup.js';




import '../../../styles/ecommerce_styles/home_page.css';
import '../../../styles/ecommerce_styles/global.css';

import '../../../styles/ecommerce_styles/signin-signup.css';



export default function SIGNUP(data = {}) {
  const { navigation, main} = Layouts(this.root);

  Navigation(navigation, data); 
  Singup(main, data);
  

  
};

