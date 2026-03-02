export default function About(root, data) {
    root.innerHTML += `
    <section id="about" class="about-bini">
        <h2 class="section-title">About ${data?.community_type || 'BINI'}</h2>
        <p>${data.description}</p>
        </section>
    `;
}