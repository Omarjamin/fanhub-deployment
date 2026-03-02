

export default function Layout(root) {
  root.innerHTML = `
    <div id="container">
      <header>
        <h1 id="register-head"></h1>
      </header>
      <main id="auth-form" class="auth-form"></main>
    </div>
  `;

  return {
    formRegistration: document.getElementById("auth-form"), 
  };
}
