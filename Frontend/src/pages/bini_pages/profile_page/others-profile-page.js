import Navigation from '../../../components/bini_components/navigation.js';
import ProfileHeader from '../../../components/bini_components/profile/profile-header.js';
import ProfileInfo from '../../../components/bini_components/profile/others-profile.js';
import Layout from '../../../layouts/bini_layout/default.js';

export default function OthersProfilePage(data = {}) {
  const { header, navigation, main } = Layout(this.root);

  ProfileHeader(header, data);
  Navigation(navigation, data);

  const queryUserId = new URLSearchParams(window.location.search).get('userId');
  const userId =
    queryUserId ||
    sessionStorage.getItem('selectedUserId') ||
    sessionStorage.getItem('selectedUserId');
  if (!userId) {
    main.innerHTML = '<p>No user selected.</p>';
    return;
  }

  sessionStorage.setItem('selectedUserId', String(userId));
  sessionStorage.setItem('selectedUserId', String(userId));
  ProfileInfo(main, { ...data, id: userId });
}
