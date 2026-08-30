document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin';
        return;
    }

    const form = document.getElementById('addCustomerForm');
    const alertBanner = document.getElementById('alertBanner');
    const alertMessage = document.getElementById('alertMessage');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    function showAlert(message) {
        alertMessage.textContent = message;
        alertBanner.classList.remove('hidden');
        
        // CHANGED: Force the entire browser window to scroll smoothly to the absolute top of the page frame
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function hideAlert() {
        alertBanner.classList.add('hidden');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        // 1. Capture fields including vehicle parameters
        const firstName = document.getElementById('firstName').value.trim();
        const middleName = document.getElementById('middleName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const mobileNumber = document.getElementById('mobileNumber').value.trim();
        const plateNumber = document.getElementById('plateNumber').value.trim();
        const vehicleType = document.getElementById('vehicleType').value;
        const brand = document.getElementById('brand').value.trim();
        const model = document.getElementById('model').value.trim();
        const color = document.getElementById('color').value.trim();

        // 2. Front-End Presence Validations
        if (!firstName || !lastName || !mobileNumber || !plateNumber || !vehicleType || !brand || !model || !color) {
            showAlert('Please populate all required form configuration boundaries.');
            return;
        }

        const username = plateNumber.replace(/\s+/g, '').toLowerCase();
        const password = 'jrvillarinpogi';

        submitBtn.disabled = true;
        btnText.textContent = 'Processing Registration...';
        btnSpinner.classList.remove('hidden');

        try {
            const response = await fetch('/api/admin/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    firstName,
                    middleName: middleName || null,
                    lastName,
                    mobileNumber,
                    plateNumber,
                    vehicleType, 
                    brand,       
                    model,       
                    color,       
                    username,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || 'System insertion operation execution failure.');
            }

            // 3. Success Routine Handling (Redirect Removed)
            alertBanner.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            alertBanner.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            alertBanner.style.color = '#a7f3d0';
            document.querySelector('.alert-icon').style.color = '#10b981';
            
            // Notification message adjusted to match the new behavior
            showAlert('Customer profile registered and archived successfully!');
            form.reset();

            // Restore the operational state of your submission button so you can add another user immediately
            submitBtn.disabled = false;
            btnText.textContent = 'Add Customer';
            btnSpinner.classList.add('hidden');

        } catch (err) {
            showAlert(err.message);
            submitBtn.disabled = false;
            btnText.textContent = 'Add Customer';
            btnSpinner.classList.add('hidden');
        }
    });
});