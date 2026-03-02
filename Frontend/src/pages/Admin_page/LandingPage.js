import LandingPageComponent from '../../components/Admin_components/Components/Admin-landing_page';

export default function LandingPage() {
  const root = this.root || document.getElementById('app');
  root.innerHTML = '';

  const landingPage = LandingPageComponent();
  root.appendChild(landingPage);
  
  // Add event listener for login success
  document.addEventListener('loginSuccess', () => {
    // This will be triggered when login is successful
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = '/dashboard';
  });
  
  return root;
}
