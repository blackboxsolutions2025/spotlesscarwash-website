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
            // Dual-purpose unified API call routing protocol
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
                // Clear state UI smoothly right before redirect page transition execution
                setLoadingState(false);

                // ==========================================================
                // CRITICAL: SANITIZE ALL EXISTING CLIENT STORAGE PROFILE KEYS
                // ==========================================================
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                localStorage.removeItem('customerToken');
                localStorage.removeItem('userID');
                sessionStorage.clear(); // Optional: clears temporary session markers cleanly

                // ROUTING CONDITIONAL BRANCH: Check if user is an administrator first
                if (data.isAdmin) {
                    // Populate authentication parameters needed by the AdminPage interface
                    localStorage.setItem('adminToken', data.token);
                    localStorage.setItem('adminUser', data.username);
                    
                    // Route directly to your Admin Dashboard workspace configuration
                    window.location.href = "/Pages/AdminPage/AdminPage.html";
                } else {
                    // Standard Customer routing workflow chain sequence secured via JWT
                    localStorage.setItem('customerToken', data.token);
                    localStorage.setItem('userID', data.userID);

                    if (data.latestBookingStatus === 'Confirmed') {
                        window.location.href = "/Pages/BookedPage/BookedPage.html";
                    } else {
                        window.location.href = "/Pages/DateTimePickerPage/DateTimePickerPage.html";
                    }
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

    // Custom Recovery Prompt Component State Engine References
    const forgotLink = document.querySelector('.forgot-link');
    const createAccountLink = document.querySelector('.create-account-link');
    const customPromptOverlay = document.getElementById('customPromptOverlay');
    const closePromptBtn = document.getElementById('closePromptBtn');
    
    // Sub-modal inner controls selectors layout elements
    const promptPhoneBtn = document.getElementById('promptPhoneBtn');
    const mainPromptCard = customPromptOverlay.querySelector('.animate-card');
    const phoneSubPromptCard = document.getElementById('phoneSubPromptCard');
    const closeSubPromptBtn = document.getElementById('closeSubPromptBtn');
    
    const copyPhoneBtn = document.getElementById('copyPhoneBtn');
    const copyBtnText = document.getElementById('copyBtnText');
    
    // Dynamic text element nodes selection
    const promptModalTitle = document.getElementById('promptModalTitle');
    const promptModalMessage = document.getElementById('promptModalMessage');
    const phoneNumber = "09672037772";

    // Trigger Layer A: Open Forgot Password View Context Setup
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (promptModalTitle && promptModalMessage) {
            promptModalTitle.textContent = "Account Recovery";
            promptModalMessage.textContent = "Choose an option below to proceed with resetting your password credentials:";
        }
        
        openMainModal();
    });

    // Trigger Layer B: Open Create Account View Context Setup
    if (createAccountLink) {
        createAccountLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (promptModalTitle && promptModalMessage) {
                promptModalTitle.textContent = "Account Registration";
                promptModalMessage.textContent = "Choose an option below to contact our management services for direct validation registration:";
            }
            
            openMainModal();
        });
    }

    // Switch View: Reveal the inner Phone Option Sub-Modal Layer Panel
    promptPhoneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainPromptCard.classList.add('hidden');
        phoneSubPromptCard.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    });

    // Switch View Back: Return from Hotline Details back to Primary Options Row
    closeSubPromptBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        phoneSubPromptCard.classList.add('hidden');
        mainPromptCard.classList.remove('hidden');
    });

    // Clipboard Async Utility Mechanics Strategy Handler with iOS Fallback
    copyPhoneBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        let success = false;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(phoneNumber);
                success = true;
            } catch (err) {
                console.warn('Modern clipboard API failed, trying legacy fallback...', err);
            }
        }

        if (!success) {
            const textArea = document.createElement("textarea");
            textArea.value = phoneNumber;
            textArea.style.position = "fixed";
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.width = "2px";
            textArea.style.height = "2px";
            textArea.style.padding = "0";
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.background = "transparent";
            textArea.style.fontSize = "16px";
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, 99999); 

            try {
                success = document.execCommand('copy');
            } catch (err) {
                console.error('All selector copying features failed:', err);
            }
            document.body.removeChild(textArea);
        }

        if (success) {
            copyBtnText.textContent = "Copied to Clipboard!";
            copyPhoneBtn.style.borderColor = "var(--accent-cyan)";
            
            setTimeout(() => {
                copyBtnText.textContent = "Copy to Clipboard";
                copyPhoneBtn.style.borderColor = "rgba(255, 255, 255, 0.08)";
            }, 1500);
        } else {
            copyBtnText.textContent = "Failed to copy. Use manual dial.";
            copyPhoneBtn.style.borderColor = "var(--error-red)";
        }
    });

    // Global Modal State Presentation Helper Routers
    function openMainModal() {
        mainPromptCard.classList.remove('hidden');
        phoneSubPromptCard.classList.add('hidden');
        customPromptOverlay.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }

    closePromptBtn.addEventListener('click', closePromptModal);
    
    customPromptOverlay.addEventListener('click', (e) => {
        if (e.target === customPromptOverlay) {
            closePromptModal();
        }
    });

    function closePromptModal() {
        customPromptOverlay.classList.add('hidden');
        phoneSubPromptCard.classList.add('hidden');
        mainPromptCard.classList.remove('hidden');
    }
});