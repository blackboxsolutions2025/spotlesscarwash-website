document.addEventListener("DOMContentLoaded", () => {
    
    // Session State tracking hooks
    let adminToken = localStorage.getItem("adminToken");
    let activePendingWorkflow = null;

    // Element bindings
    const loginOverlay = document.getElementById("loginOverlay");
    const dashboardContainer = document.getElementById("dashboardContainer");

    // --- ADDED SECURITY RESET: Kick out standard customer accounts ---
    if (!adminToken) {
        // If a standard customer attempts entry, kick them to the login screen
        if (localStorage.getItem("userID")) {
            alert("Access Denied: Customer accounts are not permitted on this dashboard.");
            window.location.href = "/";
            return;
        }
    } else {
        showDashboard();
    }

    const adminLoginForm = document.getElementById("adminLoginForm");
    const loginError = document.getElementById("loginError");
    const adminSessionLabel = document.getElementById("adminSessionLabel");
    const logoutBtn = document.getElementById("logoutBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const bookingsTableBody = document.getElementById("bookingsTableBody");

    // Modal Confirmation bindings
    const confirmModal = document.getElementById("confirmModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalDescription = document.getElementById("modalDescription");
    const modalConfirmBtn = document.getElementById("confirmChangesBtn") || document.getElementById("modalConfirmBtn");
    const modalCancelBtn = document.getElementById("dismissBtn") || document.getElementById("modalCancelBtn");

    // Verify current access session states
    if (adminToken) {
        showDashboard();
    }

    

    // Handle Form login submission
    adminLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.classList.add("hide");

        const username = document.getElementById("adminUsername").value;
        const password = document.getElementById("adminPassword").value;

        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (data.success) {
                localStorage.setItem("adminToken", data.token);
                localStorage.setItem("adminUser", data.username);
                adminToken = data.token;
                showDashboard();
            } else {
                showLoginError(data.message || "Invalid credentials provided.");
            }
        } catch (err) {
            showLoginError("Network connection to authentication driver failed.");
        }
    });

    refreshBtn.addEventListener("click", fetchBookings);

    function showDashboard() {
        if (loginOverlay) loginOverlay.classList.add("hide");
        if (dashboardContainer) dashboardContainer.classList.remove("hide");

        // FIX: Wrapped inside a defensive check to prevent null runtime crashes
        const sharedLogoutBtn = document.getElementById("drawerLogoutBtn");
        if (sharedLogoutBtn) {
            sharedLogoutBtn.addEventListener("click", () => {
                localStorage.removeItem("adminToken");
                localStorage.removeItem("adminUser");
                adminToken = null;
                if (dashboardContainer) dashboardContainer.classList.add("hide");
                if (loginOverlay) loginOverlay.classList.remove("hide");
                if (adminLoginForm) adminLoginForm.reset();
                
                document.querySelector(".burger-trigger")?.classList.remove("active");
                document.querySelector(".nav-drawer")?.classList.remove("open");
                document.querySelector(".drawer-overlay")?.classList.remove("active");
                document.body.classList.remove("drawer-locked");
            });
        }
        
        fetchBookings();
    }

    function showLoginError(msg) {
        if (loginError) {
            loginError.textContent = msg;
            loginError.classList.remove("hide");
        }
    }

    // FIX: Safely bind the reload trigger action
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchBookings);
    }

    // Fetch and populate booking transactions 
    async function fetchBookings() {
        try {
            const response = await fetch("/api/admin/bookings", {
                method: "GET",
                headers: { "Authorization": `Bearer ${adminToken}` }
            });

            if (response.status === 401 || response.status === 403) {
                logoutBtn.click();
                return;
            }

            let bookings = await response.json();

            /* OPTIONAL ADDITION: Front-end fallback sorter (Earliest to Latest) */
            bookings.sort((a, b) => {
                const dateTimeA = new Date(`${a.BookingDate.split('T')[0]}T${a.BookingTime}`);
                const dateTimeB = new Date(`${b.BookingDate.split('T')[0]}T${b.BookingTime}`);
                return dateTimeA - dateTimeB; // Ascending Order
            });

            renderTable(bookings);
        } catch (error) {
            console.error("Failed to compile dashboard listings:", error);
        }
    }

    // Format ISO Dates beautifully
    function formatDate(rawString) {
        if (!rawString) return "N/A";
        const date = new Date(rawString);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function renderTable(data) {
        bookingsTableBody.innerHTML = "";

        if (data.length === 0) {
            bookingsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:gray;">No carwash slots registered down inside database files.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement("tr");

            // Format client name fields comfortably
            const mid = item.MiddleName ? ` ${item.MiddleName.charAt(0)}.` : '';
            const fullName = `${item.FirstName}${mid} ${item.LastName}`;
            
            // Pad out Booking ID dynamically into a clean 6-digit structural format
            const formattedBookingID = String(item.BookingID).padStart(6, '0');

            tr.innerHTML = `
                <td><strong>#${formattedBookingID}</strong></td>
                <td>
                    <div>${formatDate(item.BookingDate)}</div>
                    <div style="margin-top: 6px;">
                        <code>${item.BookingTime ? item.BookingTime : 'N/A'}</code>
                    </div>
                </td>
                <td>${fullName}</td>
                <td><b style="letter-spacing:1px;">${item.PlateNumber}</b></td>
                <td>${item.MobileNumber}</td>
                <!-- FIXED: Identical structural footprint and typography parameters layout -->
                <td>
                    <div>${item.CreatedAtDate || 'N/A'}</div>
                    <div style="margin-top: 6px;">
                        <code>${item.CreatedAtTime || 'N/A'}</code>
                    </div>
                </td>
                <td><span class="badge badge-${item.Status.toLowerCase()}">${item.Status}</span></td>
                <td id="actions-cell-${item.BookingID}"></td>
            `;

            bookingsTableBody.appendChild(tr);
            renderActionButtons(item.BookingID, item.Status);
        });
    }

    // Context execution control for workflow actions
    function renderActionButtons(bookingId, status) {
        const container = document.getElementById(`actions-cell-${bookingId}`);
        container.innerHTML = "";

        // ADDED: Create a safe flex structural wrapper container inside the table cell
        const wrapper = document.createElement("div");
        wrapper.className = "actions-wrapper";

        if (status === 'Pending') {
            const confirmBtn = document.createElement("button");
            confirmBtn.className = "action-btn btn-confirm";
            confirmBtn.textContent = "Confirm";
            confirmBtn.onclick = () => openWorkflowModal(bookingId, 'Confirmed', 'Confirm this pending appointment reservation?');

            const cancelBtn = document.createElement("button");
            cancelBtn.className = "action-btn btn-cancel";
            cancelBtn.textContent = "Cancel";
            cancelBtn.onclick = () => openWorkflowModal(bookingId, 'Cancelled', 'Are you sure you want to cancel this pending appointment?');

            wrapper.appendChild(confirmBtn);
            wrapper.appendChild(cancelBtn);
            container.appendChild(wrapper);
        } 
        else if (status === 'Confirmed') {
            const completeBtn = document.createElement("button");
            completeBtn.className = "action-btn btn-complete";
            completeBtn.textContent = "Complete";
            completeBtn.onclick = () => openWorkflowModal(bookingId, 'Completed', 'Mark this appointment as complete? service finished.');

            const cancelBtn = document.createElement("button");
            cancelBtn.className = "action-btn btn-cancel";
            cancelBtn.textContent = "Cancel";
            cancelBtn.onclick = () => openWorkflowModal(bookingId, 'Cancelled', 'Mark this reservation as Cancelled (No-Show)?');

            wrapper.appendChild(completeBtn);
            wrapper.appendChild(cancelBtn);
            container.appendChild(wrapper);
        } 
        else {
            container.innerHTML = `<span class="text-muted-actions">No Actions Available</span>`;
        }
    }

    // Modal workflow routing controllers
    function openWorkflowModal(bookingId, targetStatus, message) {
        activePendingWorkflow = { bookingId, targetStatus };
        modalTitle.textContent = `Update Booking #${String(bookingId).padStart(6, '0')}`;
        modalDescription.textContent = message;
        
        // Match confirm button design colors with the context action dynamically
        if (targetStatus === 'Cancelled') {
            modalConfirmBtn.style.backgroundColor = "var(--status-cancelled)";
        } else if (targetStatus === 'Completed') {
            modalConfirmBtn.style.backgroundColor = "var(--accent-blue)";
        } else {
            modalConfirmBtn.style.backgroundColor = "var(--status-completed)";
        }

        confirmModal.classList.remove("hide");
    }

    modalCancelBtn.onclick = () => {
        confirmModal.classList.add("hide");
        activePendingWorkflow = null;
    };

    modalConfirmBtn.onclick = async () => {
        if (!activePendingWorkflow) return;
        const { bookingId, targetStatus } = activePendingWorkflow;

        // --- ADDED ADMIN IDENTITY VERIFICATION CHECK ---
        const currentAdminUser = localStorage.getItem("adminUser");
        const currentAdminToken = localStorage.getItem("adminToken");

        if (!currentAdminToken || !currentAdminUser) {
            alert("Access Denied: Only authenticated administrators can perform this action.");
            // Redirect to login or reset state safely
            confirmModal.classList.add("hide");
            activePendingWorkflow = null;
            logoutBtn.click(); 
            return;
        }

        try {
            const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentAdminToken}`
                },
                body: JSON.stringify({ nextStatus: targetStatus })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                fetchBookings();
            } else {
                // Displays error response message if database tracking fails or token drops
                alert(result.error || "Failed to update state context parameters.");
            }
        } catch (err) {
            alert("Network connection transactional failure.");
        } finally {
            confirmModal.classList.add("hide");
            activePendingWorkflow = null;
        }
    };
});
