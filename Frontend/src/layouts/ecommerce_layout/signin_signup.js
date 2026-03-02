export default function Layout(root) {
  root.innerHTML = `
      <div id="container">
        <navigation id="navigation"></navigation>
        <main id="main"></main>
      </div>
    `

  return {
    navigation: document.getElementById('navigation'),
    main: document.getElementById('main'),
  }
}
