// State trackers for user selections
let selectedDateElement = null;
let selectedTimeElement = null;
let selectedDateString = null; // Format: "YYYY-MM-DD"
let selectedTimeValue = null;  // Format: "HH:MM:SS"

// Dynamically track calendar state initialized to current system date
const today = new Date();
let targetYear = today.getFullYear();
let targetMonth = today.getMonth(); 

const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

// DOM elements references
const restrictionNotice = document.getElementById('booking-restriction-notice');
const agreementModal = document.getElementById('agreement-modal');
const agreementCheckbox = document.getElementById('agreement-checkbox');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const timeSlots = document.querySelectorAll('.time-slot');

// New Feature: Check for existing active booking on initialization
function checkActiveBooking() {
    const currentUserID = localStorage.getItem('userID');
    if (!currentUserID) return;

    fetch(`/api/bookings/my-booking?userID=${currentUserID}`)
        .then(response => {
            if (!response.ok) throw new Error("Server occupancy payload failure");
            return response.json();
        })
        .then(bookingData => {
            // Clean exit if empty or if backend flags that no booking was found
            if (!bookingData || bookingData.noBooking) {
                console.log("Verified: No active booking found. User remains on booking selector page safely.");
                return; 
            }
            
            const activeRecord = Array.isArray(bookingData) ? bookingData[0] : bookingData;
            
            // Redirect only if a genuine reservation entry is verified active
            if (activeRecord && !activeRecord.noBooking) {
                window.location.href = "/Pages/BookedPage/BookedPage.html";
            }
        })
        .catch(error => {
            console.error("Error executing active reservation check:", error);
        });
}

function renderCalendar(year, month) {
    const container = document.getElementById('days-container');
    const display = document.getElementById('month-year-display');
    container.innerHTML = '';
    
    display.textContent = `${monthNames[month]} ${year}`;

    let firstDayIndex = new Date(year, month, 1).getDay();
    let adjustedIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    for (let i = 0; i < adjustedIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day', 'empty');
        container.appendChild(emptyDiv);
    }

    const totalDays = new Date(year, month + 1, 0).getDate();

    // Reference dates ignoring hours for pure calendar calculations
    const midnightToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.textContent = day;

        const currentLoopDate = new Date(year, month, day);
        const formattedMonth = String(month + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        const loopDateStr = `${year}-${formattedMonth}-${formattedDay}`;

        // 1.) Disable dates before our date today
        if (currentLoopDate < midnightToday) {
            dayDiv.classList.add('disabled');
        } else {
            // Restore selection highlight state during month paging actions
            if (selectedDateString === loopDateStr) {
                dayDiv.classList.add('selected');
                selectedDateElement = dayDiv;
            }

            dayDiv.addEventListener('click', () => {
                if (selectedDateElement) {
                    selectedDateElement.classList.remove('selected');
                }
                dayDiv.classList.add('selected');
                selectedDateElement = dayDiv;
                selectedDateString = loopDateStr;

                // 2.) Display notice if chosen date is exactly today
                if (currentLoopDate.getTime() === midnightToday.getTime()) {
                    restrictionNotice.classList.remove('hidden');
                } else {
                    restrictionNotice.classList.add('hidden');
                }

                // 3.) Fetch busy booking configurations from your server
                fetchBusySlots(selectedDateString);
            });
        }

        container.appendChild(dayDiv);
    }
}

// 3.) Fetch busy slots and crossout booked times
async function fetchBusySlots(dateStr) {
    // Clear old time selections on day changes to ensure clean payloads
    if (selectedTimeElement) {
        selectedTimeElement.classList.remove('selected');
        selectedTimeElement = null;
        selectedTimeValue = null;
    }

    // Reference the container parent node element
    const timeSection = document.querySelector('.time-section');
    
    // Create and append the loading overlay layout element dynamically
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'time-loading-overlay';
    loadingOverlay.textContent = 'Checking slot availability...';
    timeSection.appendChild(loadingOverlay);

    try {
        // Enforce a minimum delay promise of 1.5 seconds (1500ms)
        const minimumDelayPromise = new Promise(resolve => setTimeout(resolve, 1000));
        
        // Execute the backend request fetch promise
        const fetchPromise = fetch(`/api/bookings/busy-slots?date=${dateStr}`);

        // Wait until both the network request AND the 1.5-second timer complete
        const [response] = await Promise.all([fetchPromise, minimumDelayPromise]);
        
        if (!response.ok) throw new Error("Network occupancy payload failure");
        
        const data = await response.json();
        const confirmedTimes = data.bookedTimes; // Array: ['08:00:00', '14:00:00']

        timeSlots.forEach(slot => {
            const timeVal = slot.getAttribute('data-time');
            
            // Cross-match elements using standard MySQL format
            const isBooked = confirmedTimes.some(booked => booked.substring(0, 5) === timeVal.substring(0, 5));

            if (isBooked) {
                slot.classList.add('booked-disabled');
                slot.classList.remove('selected');
            } else {
                slot.classList.remove('booked-disabled');
            }
        });
    } catch (err) {
        console.error("Error running slot diagnostic mapping:", err);
    } finally {
        // Remove the loading screen overlay element mask once data mapping ends
        if (loadingOverlay && loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
    }
}

// Global delegated capture for operational time elements
document.getElementById('time-container').addEventListener('click', (e) => {
    const slot = e.target.closest('.time-slot');
    if (!slot || slot.classList.contains('booked-disabled')) return;

    if (selectedTimeElement) {
        selectedTimeElement.classList.remove('selected');
    }
    slot.classList.add('selected');
    selectedTimeElement = slot;
    selectedTimeValue = slot.getAttribute('data-time');
});

// Navigation controllers mapping
document.getElementById('prev-month').addEventListener('click', () => {
    targetMonth--;
    if (targetMonth < 0) { targetMonth = 11; targetYear--; }
    renderCalendar(targetYear, targetMonth);
});

document.getElementById('next-month').addEventListener('click', () => {
    targetMonth++;
    if (targetMonth > 11) { targetMonth = 0; targetYear++; }
    renderCalendar(targetYear, targetMonth);
});

// 4.) Trigger policy verification window modal overlay element layout
document.getElementById('book-now-btn').addEventListener('click', () => {
    const currentUserID = localStorage.getItem('userID');
    if (!currentUserID) {
        alert("Session missing. Please log in first.");
        return;
    }
    if (!selectedDateString || !selectedTimeValue) {
        alert("Please pick an available date and time slot first!");
        return;
    }

    // CHECK FOR SAME-DAY BOOKING BLOCK RULE
    const midnightToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const formattedMonth = String(midnightToday.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(midnightToday.getDate()).padStart(2, '0');
    const todayDateString = `${midnightToday.getFullYear()}-${formattedMonth}-${formattedDay}`;

    if (selectedDateString === todayDateString) {
        alert("Booking Denied: Same-day reservations are prohibited. You can only book a day before your desired appointment schedule.");
        return; // Terminate execution immediately to prevent the policy modal window from opening
    }

    agreementModal.classList.remove('hidden');
});

// Sync conditional state of the main agreement action trigger
agreementCheckbox.addEventListener('change', (e) => {
    modalConfirmBtn.disabled = !e.target.checked;
});

// Cancel UI action resets states clean
document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    agreementModal.classList.add('hidden');
    agreementCheckbox.checked = false;
    modalConfirmBtn.disabled = true;
});

// 5.) Submit reservation parameters straight to your backend system
modalConfirmBtn.addEventListener('click', async () => {
    const currentUserID = localStorage.getItem('userID');
    if (!currentUserID) {
        alert("User session expired. Please log in again.");
        return;
    }

    try {
        const response = await fetch('/api/bookings/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingDate: selectedDateString,
                bookingTime: selectedTimeValue,
                userID: currentUserID 
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert("Success! Your car wash booking has been scheduled and confirmed.");
            agreementModal.classList.add('hidden');
            agreementCheckbox.checked = false;
            modalConfirmBtn.disabled = true;

            // REDIRECTION CHANGE: Navigate user to the Booked page dashboard
            window.location.href = "/Pages/BookedPage/BookedPage.html"; 
        } else {
            alert(`Booking Denied: ${result.error || 'Server error occurred.'}`);
        }
    } catch (err) {
        console.error(err);
        alert("Fatal communication failure executing network update transactions.");
    }
});

// Initialize setup pipelines
checkActiveBooking();
renderCalendar(targetYear, targetMonth);
