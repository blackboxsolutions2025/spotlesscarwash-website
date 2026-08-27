document.addEventListener("DOMContentLoaded", () => {
    // Prevent rendering multiple headers if script is included multiple times
    if (document.querySelector(".main-header")) return;

    // Create header structural element layout tree
    const header = document.createElement("header");
    header.className = "main-header";

    // Build logo brand anchor child node element
    const logo = document.createElement("div");
    logo.className = "logo";
    logo.textContent = "SPOTLESS CARWASH";

    header.appendChild(logo);

    // Inject cleanly at the absolute top boundary of the body context
    document.body.insertBefore(header, document.body.firstChild);
});
