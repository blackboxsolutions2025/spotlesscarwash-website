document.addEventListener("DOMContentLoaded", () => {
    // Prevent rendering duplicate headers if included multiple times across frame files
    if (document.querySelector(".main-header")) return;

    // Create container structural header layout element node
    const header = document.createElement("header");
    header.className = "main-header";

    // Build the responsive animated burger trigger block
    const burgerBtn = document.createElement("button");
    burgerBtn.className = "burger-trigger";
    burgerBtn.setAttribute("aria-label", "Toggle Navigation Menu");
    burgerBtn.innerHTML = `
        <span class="burger-line"></span>
        <span class="burger-line"></span>
        <span class="burger-line"></span>
    `;
    header.appendChild(burgerBtn);

    // Build logo brand anchor text node element layer
    const logo = document.createElement("div");
    logo.className = "logo";
    logo.textContent = "SPOTLESS CARWASH";
    header.appendChild(logo);

    // Build high-fidelity drawer layout panel element trees safely
    // ADDED: User Profile list item link matching your exact required path parameters
    const navDrawer = document.createElement("nav");
    navDrawer.className = "nav-drawer";
    navDrawer.innerHTML = `
        <div class="drawer-header">Menu Navigation</div>
        <ul class="drawer-links">
            <li><a href="/Pages/BookedPage/BookedPage.html" class="drawer-item" id="navLinkBooked">My Reservation</a></li>
            <li><a href="/Pages/DateTimePickerPage/DateTimePickerPage.html" class="drawer-item" id="navLinkSchedule">Book Appointment</a></li>
            <li><a href="/Pages/ProfilePage/ProfilePage.html" class="drawer-item" id="navLinkProfile">User Profile</a></li>
            <li class="divider-line"></li>
            <li><button id="drawerLogoutBtn" class="drawer-logout-btn">Log Out Securely</button></li>
        </ul>
    `;
    document.body.appendChild(navDrawer);

    // Assemble background backdrop transparency masking plate layout
    const drawerOverlay = document.createElement("div");
    drawerOverlay.className = "drawer-overlay";
    document.body.appendChild(drawerOverlay);

    // Secure insertion boundary rule directly onto top-level body content frame
    document.body.insertBefore(header, document.body.firstChild);

    // Dynamic active route tab layout tracker matching current windows locations path
    const currentPath = window.location.pathname;
    if (currentPath.includes("BookedPage")) {
        document.getElementById("navLinkBooked")?.classList.add("active");
    } else if (currentPath.includes("DateTimePickerPage")) {
        document.getElementById("navLinkSchedule")?.classList.add("active");
    } else if (currentPath.includes("ProfilePage")) {
        document.getElementById("navLinkProfile")?.classList.add("active");
    }

    // Toggle menu state handler callbacks
    const toggleMenu = () => {
        burgerBtn.classList.toggle("active");
        navDrawer.classList.toggle("open");
        drawerOverlay.classList.toggle("active");
        document.body.classList.toggle("drawer-locked");
    };

    burgerBtn.addEventListener("click", toggleMenu);
    drawerOverlay.addEventListener("click", toggleMenu);

    // Safe authorization clearance event tracker
    document.body.addEventListener("click", (e) => {
        if (e.target && e.target.id === "drawerLogoutBtn") {
            localStorage.removeItem("userID");
            window.location.href = "/";
        }
    });
});
