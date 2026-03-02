import Header from '../../../components/bini_components/post/Header.js';
import Navigation from '../../../components/bini_components/navigation.js';
import CreatePost from '../../../components/bini_components/post/create-post-modal.js';
import HomePage from '../../../components/bini_components/home/homepage-post.js';
import Layout from '../../../layouts/bini_layout/default.js';
import '../../../styles/bini_styles/home.css';

export default function Home(data = {}) {
  const { header, navigation, main } = Layout(this.root);

  Header(header, data);
  Navigation(navigation, data); 
  HomePage(main, data);
  
};

