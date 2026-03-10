import NotifHeader from '../../../components/bini_components/notif/notifications-header.js';
import loadNotifications from '../../../components/bini_components/notif/notifications.js';

import Navigation from '../../../components/bini_components/navigation.js';
import Layout from '../../../layouts/bini_layout/default.js';
import '../../../styles/bini_styles/notifications.css';


export default function Notifications(data = {}) {
  const { header, navigation, main, footer } = Layout(this.root, data);

  NotifHeader(header, data);
  loadNotifications(main, data);
  Navigation(navigation, data); 
  

};
