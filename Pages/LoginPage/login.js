document.addEventListener('DOMContentLoaded', () => {
    // DOM References Elements selection
    const loginForm = document.getElementById('loginForm');
    const plateInput = document.getElementById('plateInput');
    const passInput = document.getElementById('passInput');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = document.getElementById('btnSpinner');
    const alertBox = document.getElementById('alertBox');
    const alertMessage = document.getElementById('alertMessage');

    // Toggle Password Visibility Mechanism
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type = isPassword ? 'text' : 'password';
        
        // Update eye icon visually using lucide attributes update method
        eyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        lucide.createIcons();
    });

    // Form Event Handler Execution
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        // Standard Front-end Client Validations
        const plate = plateInput.value.trim();
        const password = passInput.value.trim();

        if (!plate || !password) {
            showAlert('Please fulfill all required fields credentials.');
            return;
        }

        // Set processing loader infrastructure states
        setLoadingState(true);

        try {
            // Unchanged API Compatibility Protocol with required data key schemas
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    plateNumber: plate,
                    password: password
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error status received: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // SAVES THE USER ID TO STORAGE SO THE DATETIMEPICKERPAGE CAN USE IT
                localStorage.setItem('userID', data.userID);
                
                // Clear state UI smoothly right before redirect page transition execution
                setLoadingState(false);

                // Conditional Routing based on the most recent Booking status state
                if (data.latestBookingStatus === 'Confirmed') {
                    // Direct absolute desktop file path routing requested
                    window.location.href = "/Pages/BookedPage/BookedPage.html";
                } else {
                    // Fallback router path configuration
                    window.location.href = "/Pages/DateTimePickerPage/DateTimePickerPage.html";
                }
            } else {
                setLoadingState(false);
                showAlert(data.message || 'Authentication sequence failed.');
            }
        } catch (error) {
            console.error('Login error execution handling:', error);
            setLoadingState(false);
            showAlert('Unable to establish connection to the management server. Please try again.');
        }
    });

    // Helper functions setup
    function setLoadingState(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }

    function showAlert(message) {
        alertMessage.textContent = message;
        alertBox.classList.remove('hidden');
    }

    function hideAlert() {
        alertBox.classList.add('hidden');
        alertMessage.textContent = '';
    }
});
