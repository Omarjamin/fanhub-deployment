export default function Layout(root) {
  root.innerHTML = `
    <div id="container">
      <header>
      </header>
      <main id="auth-form-login" class="auth-form-login"></main>
      <footer id="footer"></footer>      
    </div>
  `;

  return {
    main: document.getElementById("auth-form-login"),
    footer: document.getElementById("footer"),
  };
}
