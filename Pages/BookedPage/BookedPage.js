document.addEventListener("DOMContentLoaded", () => {
    // 1. Secure authorization check from localStorage tracking layer
    const userID = localStorage.getItem("userID");

    if (!userID) {
        showErrorState("Access Denied", "No valid authentication token found. Please log in first.");
        return;
    }

    // 2. Fetch User Reservation Details
    fetch(`/api/bookings/my-booking?userID=${userID}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => { throw errData; });
            }
            return response.json();
        })
        .then(bookingData => {
            // Check all empty data scenarios AND explicit noBooking flags from the server
            const isEmptyArray = Array.isArray(bookingData) && bookingData.length === 0;
            const isEmptyObject = bookingData && typeof bookingData === 'object' && Object.keys(bookingData).length === 0;
            const hasNoBookingFlag = bookingData && bookingData.noBooking === true;

            if (!bookingData || isEmptyArray || isEmptyObject || hasNoBookingFlag) {
                // Manually trigger the "No Booking Found" view state instead of crashing
                showErrorState("No Booking Found", "You do not have an active or pending reservation status under this profile layer.");
                return; // Stops execution completely so it never reaches populateBookingDashboard
            }

            // Fix applied here to handle row results arrays cleanly
            const activeRecord = Array.isArray(bookingData) ? bookingData[0] : bookingData;
            populateBookingDashboard(activeRecord);
        })
        .catch(error => {
            console.error("Dashboard synchronization error:", error);
            if (error.noBooking) {
                showErrorState("No Booking Found", "You do not have an active or pending reservation status under this profile layer.");
            } else {
                showErrorState("System Failure", "Could not parse reservation payload data over database connection errors.");
            }
        });
});

/**
 * Parses and processes data parameters safely onto DOM Element layers
 */
function populateBookingDashboard(data) {
    // Format Display Variables
    const formattedDate = formatDatabaseDate(data.BookingDate);
    const formattedTime = format24HourTime(data.BookingTime);
    const formattedCreatedAt = formatTimestamp(data.BookingCreatedAt);
    
    // Assemble Customer Name Component
    const middleInitial = data.MiddleName ? ` ${data.MiddleName.charAt(0)}.` : '';
    const fullCustomerName = `${data.FirstName}${middleInitial} ${data.LastName}`;

    // Target Element Injection Mechanics
    document.getElementById("bookingDate").textContent = formattedDate;
    document.getElementById("bookingTime").textContent = formattedTime;
    document.getElementById("bookingId").textContent = `#${String(data.BookingID).padStart(6, '0')}`;
    document.getElementById("createdAt").textContent = formattedCreatedAt;
    document.getElementById("customerName").textContent = fullCustomerName;
    document.getElementById("plateNumber").textContent = data.PlateNumber.toUpperCase();
    document.getElementById("mobileNumber").textContent = data.MobileNumber;

    // Dynamic Interface Crossfade Switching
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("bookingCard").classList.remove("hidden");
}

/**
 * Transforms "2026-08-30" string input format to "August 30, 2026"
 */
function formatDatabaseDate(dateString) {
    const dateObj = new Date(dateString);
    if (isNaN(dateObj)) return dateString;
    return dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

/**
 * Transforms database "14:00:00" string inputs to standard "2:00 PM"
 */
function format24HourTime(timeString) {
    // Defensive check: If timeString is null, undefined, or empty, return a placeholder
    if (!timeString) return "--:-- --";

    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return timeString;
    
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${hours}:${minutes} ${ampm}`;
}

/**
 * Transforms database standard timestamp values to "August 26, 2026 at 11:43 PM"
 */
function formatTimestamp(timestampString) {
    const dateObj = new Date(timestampString);
    if (isNaN(dateObj)) return timestampString;

    const dateStr = dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${dateStr} at ${hours}:${minutes} ${ampm}`;
}

/**
 * Updates UI component visualization upon error or empty returns
 */
function showErrorState(title, description) {
    document.getElementById("errorTitle").textContent = title;
    document.getElementById("errorDescription").textContent = description;
    
    // Direct target selection using our new explicit ID element
    const actionBtn = document.getElementById("errorActionBtn");
    
    if (actionBtn) {
        if (title === "No Booking Found") {
            actionBtn.textContent = "Make an Appointment";
        } else {
            actionBtn.textContent = "Schedule a Session";
        }

        // Set routing path straight to your calendar wizard
        actionBtn.onclick = () => {
            window.location.href = "/Pages/DateTimePickerPage/DateTimePickerPage.html";
        };
    }
    
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("bookingCard").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
}


