document.addEventListener('DOMContentLoaded', () => {
    // Extracts validation context exactly how your scheduling dashboards manage it
    const userID = localStorage.getItem('userID');
    if (!userID) {
        // Redirection fallback routine if authentication metrics aren't active
        window.location.href = '../LoginPage/login.html';
        return;
    }

    // Trace tracking properties definitions
    let originalUsername = '';

    // Primary DOM Target Selector Nodes
    const globalMessage = document.getElementById('globalMessage');
    const globalMessageText = document.getElementById('globalMessageText');
    
    // Target fields configuration elements mapping
    const txtUsername = document.getElementById('username');
    const btnEditUsername = document.getElementById('btnEditUsername');
    
    const txtPassword = document.getElementById('password');
    const txtCurrentPassword = document.getElementById('currentPassword'); // New field reference
    const passwordRowGroup = document.getElementById('passwordRowGroup'); // Row container holding both fields
    const btnEditPassword = document.getElementById('btnEditPassword');

    // Initialize data synchronization chain pipeline execution
    fetchProfileData();

    async function fetchProfileData() {
        try {
            // Passes token details across parameter query blocks matching server rules
            const response = await fetch(`/api/profile?userID=${userID}`);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '../LoginPage/login.html';
                    return;
                }
                throw new Error('Failed to retrieve core profile metadata parameters.');
            }
            
            // Unpacked single object format match verification loop
            const data = await response.json();
            
            if (!data) throw new Error('Account trace information block mapping missing.');

            // Sync static fields layout inputs cleanly
            document.getElementById('firstName').value = data.FirstName || '';
            document.getElementById('middleName').value = data.MiddleName || '';
            document.getElementById('lastName').value = data.LastName || '';
            document.getElementById('mobileNumber').value = data.MobileNumber || '';
            
            // NEW SEPARATED VEHICLE PROPERTIES ASSIGNMENT STRATEGY
            document.getElementById('plateNumber').value = data.PlateNumber || '';
            document.getElementById('vehicleType').value = data.VehicleType || '';
            document.getElementById('brand').value = data.Brand || '';
            document.getElementById('model').value = data.Model || '';
            document.getElementById('color').value = data.Color || '';

            // Assign Editable Tracking States without modifying active focus elements
            if (btnEditUsername.textContent === 'Edit') {
                txtUsername.value = data.Username || '';
                originalUsername = data.Username || '';
            }

        } catch (error) {
            displayGlobalAlert(error.message, 'error');
        }
    }

    // ==========================================================
    // INLINE USERNAME INTERACTION HANDLER
    // ==========================================================
    btnEditUsername.addEventListener('click', async () => {
        clearErrors();
        
        if (btnEditUsername.textContent === 'Edit') {
            // Transition element layout to an editable configuration mode state
            unlockInputField(txtUsername, btnEditUsername);
            btnEditPassword.disabled = true; // Lock alternate lane to block transaction drift overlaps
        } else {
            // Process Save operational cycle logic routine
            const usernameInput = txtUsername.value.trim();

            if (!usernameInput) {
                showFieldError('usernameError', 'Username field cannot be left blank.');
                return;
            }

            if (usernameInput === originalUsername) {
                lockInputField(txtUsername, btnEditUsername);
                btnEditPassword.disabled = false;
                displayGlobalAlert('No modifications made to username configuration.', 'error');
                return;
            }

            // Dispatches single parameter variable structure to query track loop
            const success = await executeProfileUpdate({ username: usernameInput });
            if (success) {
                originalUsername = usernameInput;
                lockInputField(txtUsername, btnEditUsername);
                btnEditPassword.disabled = false; // explicitly re-enable alternate field triggers
            } else {
                btnEditPassword.disabled = false; // ensure interaction tracks restore on submission errors
            }
        }
    });

    // ==========================================================
    // INLINE PASSWORD INTERACTION HANDLER
    // ==========================================================
    btnEditPassword.addEventListener('click', async () => {
        clearErrors();
        
        const newPasswordRow = document.getElementById('newPasswordRow');
        const passwordButtonContainer = document.getElementById('passwordButtonContainer');
        
        if (btnEditPassword.textContent === 'Edit') {
            // Drop the New Password field layout row into view smoothly using block rendering overrides
            if (newPasswordRow) {
                newPasswordRow.classList.remove('hidden');
                newPasswordRow.style.display = 'flex'; 
            }
            
            // Dynamically match heights to balance button centering against both inputs (48px * 2 + 16px gap = 112px)
            if (passwordButtonContainer) {
                passwordButtonContainer.style.height = '112px';
            }
            
            txtCurrentPassword.value = '';
            txtPassword.value = '';
            
            // Unlock fields for verification text metric parameters
            unlockInputField(txtCurrentPassword, btnEditPassword);
            txtPassword.removeAttribute('readonly');
            txtPassword.removeAttribute('disabled');
            txtPassword.classList.remove('input-readonly');
            
            /* ==========================================================
               ADD THIS: Reveal all eye button elements on edit start
               ========================================================== */
            document.querySelectorAll('.toggle-password-btn').forEach(btn => {
                btn.classList.add('is-editing');
            });
            
            txtCurrentPassword.focus();
            btnEditPassword.textContent = 'Save';
            btnEditPassword.classList.add('active-save-state');
            btnEditUsername.disabled = true; // Lock alternate lane to block transaction drift overlaps
        } else {
            // Process Save operational cycle logic routine
            const currentPasswordInput = txtCurrentPassword.value;
            const newPasswordInput = txtPassword.value;

            if (!currentPasswordInput) {
                showFieldError('passwordError', 'Current Password field cannot be left blank.');
                return;
            }

            if (!newPasswordInput) {
                showFieldError('passwordError', 'New Password field cannot be left blank.');
                return;
            }

            // Dispatches replacement data structures cross-matching verification steps
            const success = await executeProfileUpdate({ 
                currentPassword: currentPasswordInput, 
                newPassword: newPasswordInput 
            });
            
            if (success) {
                // Clear baseline values cleanly
                txtCurrentPassword.value = '';
                txtPassword.value = '';

                // RESET FIELDS BACK TO PASSWORD TYPE SECURELY ON TRANSACTION LIFECYCLE CLOSES
                txtCurrentPassword.type = 'password';
                txtPassword.type = 'password';

                // Revert button icons back to closed-eye defaults
                document.querySelectorAll('.toggle-password-btn').forEach(btn => {
                    /* ==========================================================
                       ADD THIS: Hide eye icons cleanly on workflow complete
                       ========================================================== */
                    btn.classList.remove('is-editing');
                    
                    btn.innerHTML = `
                        <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    `;
                });
                
                // Mask layout view by hiding the new password block row again completely
                if (newPasswordRow) {
                    newPasswordRow.classList.add('hidden');
                    newPasswordRow.style.display = 'none'; // Force hide layout display
                }
                
                // Reset button container context tracking back to baseline field dimensions (48px)
                if (passwordButtonContainer) {
                    passwordButtonContainer.style.height = '48px';
                }
                
                lockInputField(txtCurrentPassword, btnEditPassword);
                txtPassword.setAttribute('readonly', 'true');
                txtPassword.setAttribute('disabled', 'true');
                txtPassword.classList.add('input-readonly');
                
                btnEditPassword.textContent = 'Edit';
                btnEditPassword.classList.remove('active-save-state');
                btnEditUsername.disabled = false; // Explicitly re-enable alternate field triggers
            } else {
                btnEditUsername.disabled = false; // Restore user access rules upon failure metrics
            }
        }
    });

    // ==========================================================
    // DYNAMIC PASSWORD VISIBILITY TOGGLE INDICATOR HANDLER
    // ==========================================================
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Prevent click events from propagating to structural form wrapper bubbles
            e.preventDefault();
            
            const targetId = btn.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            if (!passwordInput) return;

            // Toggle textual rendering properties values natively
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                // Swap display to Open Eye Icon SVG
                btn.innerHTML = `
                    <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                `;
            } else {
                passwordInput.type = 'password';
                // Swap display back to Closed Eye Icon SVG
                btn.innerHTML = `
                    <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                `;
            }
        });
    });

    // ==========================================================
    // UNIVERSAL UPDATE CONTROLLER FUNCTION
    // ==========================================================
    async function executeProfileUpdate(dataFields) {
        const payload = { userID: userID, ...dataFields };
        disableTriggerToggle(true);

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            disableTriggerToggle(false);

            if (!response.ok) {
                if (result.field === 'username') {
                    showFieldError('usernameError', result.message);
                } else if (result.field === 'password' || result.field === 'currentPassword') {
                    showFieldError('passwordError', result.message);
                } else {
                    displayGlobalAlert(result.message || 'An unexpected error blocked execution.', 'error');
                }
                return false;
            }

            displayGlobalAlert('Account configuration updated successfully!', 'success');
            await fetchProfileData(); // Sync references with server changes
            return true;

        } catch (err) {
            disableTriggerToggle(false);
            displayGlobalAlert('Unable to establish communication with the administration servers.', 'error');
            return false;
        }
    }

    // Helper functions for UI interaction management
    function unlockInputField(inputNode, buttonNode) {
        inputNode.removeAttribute('readonly');
        inputNode.removeAttribute('disabled');
        inputNode.classList.remove('input-readonly');
        inputNode.focus();
        buttonNode.textContent = 'Save';
        buttonNode.classList.add('active-save-state');
    }

    function lockInputField(inputNode, buttonNode) {
        inputNode.setAttribute('readonly', 'true');
        inputNode.setAttribute('disabled', 'true');
        inputNode.classList.add('input-readonly');
        buttonNode.textContent = 'Edit';
        buttonNode.classList.remove('active-save-state');
    }

    function disableTriggerToggle(isProcessing) {
        // Toggle processing locks without leaving them permanently disabled upon transaction success cycles
        btnEditUsername.disabled = isProcessing;
        btnEditPassword.disabled = isProcessing;
    }

    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'drawerLogoutBtn') {
            localStorage.removeItem('userID');
            window.location.href = '/';
        }
    });

    function showFieldError(id, msg) {
        document.getElementById(id).textContent = msg;
    }

    function clearErrors() {
        document.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
        globalMessage.classList.add('hidden');
        globalMessage.className = 'alert-container hidden';
    }

    function displayGlobalAlert(msg, type) {
        globalMessageText.textContent = msg;
        globalMessage.className = `alert-container ${type}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});