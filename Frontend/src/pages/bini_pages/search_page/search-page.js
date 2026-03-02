import Header from '../../../components/bini_components/post/Header.js';
import Navigation from '../../../components/bini_components/navigation.js';
import Layout from '../../../layouts/bini_layout/default.js';
import SearchHeader from '../../../components/bini_components/search/search-header.js';
import Search_ from '../../../components/bini_components/search/search_.js';
import '../../../styles/bini_styles/search.css';

export default function Search(data = {}) {
  const { header, navigation, main } = Layout(this.root);

  SearchHeader(header);
  Navigation(navigation, data); 
  Search_(main, data);
  
  
  
}
