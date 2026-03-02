// Landing page layout - used for the initial landing page
export default function LandingPage(root) {
  // Clear the root element
  root.innerHTML = '';
  
  // Create a simple layout container
  const container = document.createElement('div');
  container.id = 'landing-page';
  
  // Append the container to the root
  root.appendChild(container);
  
  // Return the container where the landing page content will be rendered
  return container;
}
