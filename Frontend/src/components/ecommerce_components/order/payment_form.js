export default async function PaymentForm(root) {
    root.innerHTML = `
        <div class="form-container">
            <h3>Payment Method</h3>
            <form id="paymentForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="paymentMethod">Select Payment Method</label>
                        <select id="paymentMethod" required>
                            <option value="">Select Payment Method</option>
                            <option value="cod">Cash on Delivery</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button class="btn-next" id="paymentNextBtn" type="button">Next</button>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Load previously saved data if available
    const savedPaymentData = sessionStorage.getItem('paymentData');
    if (savedPaymentData) {
        try {
            const data = JSON.parse(savedPaymentData);
            if (data.method) {
                document.getElementById('paymentMethod').value = data.method;
            }
        } catch (e) {
            console.error('Error loading saved payment data:', e);
        }
    }

    // Setup event listener to save payment data to sessionStorage
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', () => {
            const paymentData = {
                method: paymentMethodSelect.value,
                methodText: paymentMethodSelect.options[paymentMethodSelect.selectedIndex].text
            };
            sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
        });
    }

    // Setup next button functionality
    setTimeout(() => {
        const nextBtn = document.getElementById('paymentNextBtn');
        if (nextBtn && !nextBtn.hasAttribute('data-payment-handler')) {
            nextBtn.setAttribute('data-payment-handler', 'true');
            nextBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Show loading state
                const origText = nextBtn.textContent;
                nextBtn.disabled = true;
                nextBtn.textContent = 'Processing...';
                
                try {
                    // Validate payment method is selected
                    const paymentMethod = document.getElementById('paymentMethod');
                    if (!paymentMethod || !paymentMethod.value) {
                        paymentMethod.style.borderColor = '#ff3d8b';
                        paymentMethod.addEventListener('change', function() {
                            this.style.borderColor = '';
                        }, { once: true });
                        alert('Please select a payment method');
                        nextBtn.disabled = false;
                        nextBtn.textContent = origText;
                        return;
                    }

                    // Save payment data
                    const paymentData = {
                        method: paymentMethod.value,
                        methodText: paymentMethod.options[paymentMethod.selectedIndex].text
                    };
                    sessionStorage.setItem('paymentMethod', paymentMethod.value);
                    sessionStorage.setItem('paymentData', JSON.stringify(paymentData));

                    // Small delay for smooth transition
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // Update step in sessionStorage
                    sessionStorage.setItem('checkoutStep', '3');
                    
                    // Trigger step change event
                    window.dispatchEvent(new Event('stepChanged'));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch (error) {
                    console.error('Error in payment form:', error);
                    alert('An error occurred. Please try again.');
                    nextBtn.disabled = false;
                    nextBtn.textContent = origText;
                }
            });
        }
    }, 100);
}