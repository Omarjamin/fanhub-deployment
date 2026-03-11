import setupThreadsFab from "../threads-fab.js";

export default function SearchHeader(root) {
  root.innerHTML = `
    <h1 class="search-header">Search</h1>
  `;

  setupThreadsFab();
}
