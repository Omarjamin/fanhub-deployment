export default function SearchNavigation(root) {
  root.innerHTML = `
    <nav class="bottom-nav-search">
            <a href="/" class="nav-item-search">
                <span class="material-icons">home</span>
            </a>
            <a href="/search" id="searchcon" class="nav-item-search" activate>
                <span class="material-icons">search</span>
            </a>
            <a href="#" class="nav-item-search" id="newPostNavBtn">
                <span class="material-icons">add_box</span>
            </a>
            <a href="likes.html" class="nav-item-search">
                <span class="material-icons">favorite_border</span>
            </a>
            <a href="profile.html" class="nav-item-search">
                <span class="material-icons">person</span>
            </a>
     </nav>
  `;
}
