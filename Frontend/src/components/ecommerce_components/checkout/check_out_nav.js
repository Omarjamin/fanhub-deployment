export default function CheckOutNav(root) {
    const container = document.createElement('div');
    container.className = 'checkout-buttons-container';
    container.innerHTML = `
        <button id="backbtn" class="checkout-btn checkout-btn-secondary">Back</button>
        <button id="nextbtn" class="checkout-btn checkout-btn-primary">Next</button>
    `;
    root.appendChild(container);
}