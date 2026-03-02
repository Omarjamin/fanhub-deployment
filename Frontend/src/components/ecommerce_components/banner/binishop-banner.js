export default function Binishop_banner(root, data = {}) {
        root.innerHTML += `
        <section class="binishop-banner">
            <div class="banner-inner">
                <div class="banner-content">
                        <h2 class="banner-title">Welcome to ${data?.community_type} Shop</h2>
                        <p class="banner-text">Discover exclusive ${data?.community_type} merchandise — shirts, accessories, and limited drops supporting the community.</p>
                </div>
            </div>
        </section>
        `;
}




