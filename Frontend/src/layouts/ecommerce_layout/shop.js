export default function Layout(root) {
	root.innerHTML = `
		<div id="container">
			<navigation id="navigation"></navigation>
			<main id="main"></main>
			<footer id="footer"></footer>
		</div>
	`;

	return {
		navigation: document.getElementById('navigation'),
		main: document.getElementById('main'),
		footer: document.getElementById('footer'),
	};
}
