const staffMenuToggle = document.querySelector("#staff-menu-toggle");
const staffNav = document.querySelector("#staff-nav");
const staffMobileLayout = window.matchMedia("(max-width: 760px)");

const staffPages = [
    { id: "departments", label: "Departments", roles: ["administrator", "receptionist"] },
    { id: "doctors", label: "Doctors", roles: ["administrator", "receptionist"] },
    { id: "patients", label: "Patients" },
    { id: "appointments", label: "Appointments" },
    { id: "medical-records", label: "Medical Records", roles: ["administrator", "doctor"] },
    { id: "users", label: "User Management", roles: ["administrator"] }
];

function getStaffPreviewRole(allowed = ["administrator", "receptionist", "doctor"]) {
    const requested = new URLSearchParams(location.search).get("role");
    return allowed.includes(requested) ? requested : "administrator";
}

function staffPageUrl(page, role) {
    return `${page}.html?role=${role}`;
}

function updateStaffNavigation(role, currentPage) {
    const dashboard = staffNav.querySelector("a");
    if (currentPage !== "dashboard") {
        dashboard.href = staffPageUrl("dashboard", role);
    }

    for (const link of staffNav.querySelectorAll("[data-module-link]")) {
        link.remove();
    }

    let previousLink = dashboard;
    for (const page of staffPages) {
        if (page.roles && !page.roles.includes(role) && page.id !== currentPage) {
            continue;
        }

        const link = document.createElement("a");
        link.dataset.moduleLink = page.id;
        link.href = staffPageUrl(page.id, role);
        link.textContent = page.label;

        if (page.id === currentPage) {
            link.href = "#main-content";
            link.setAttribute("aria-current", "page");
        }

        previousLink.after(link);
        previousLink = link;
    }
}

function setStaffMenuOpen(isOpen) {
    staffMenuToggle.setAttribute("aria-expanded", String(isOpen));
    staffNav.hidden = !isOpen;
}

function syncStaffMenu() {
    const isMobile = staffMobileLayout.matches;
    const focusedElement = document.activeElement;
    staffMenuToggle.hidden = !isMobile;
    setStaffMenuOpen(!isMobile);

    if (isMobile && staffNav.contains(focusedElement)) {
        staffMenuToggle.focus();
    } else if (!isMobile && focusedElement === staffMenuToggle) {
        staffNav.querySelector("a").focus();
    }
}

staffMenuToggle.addEventListener("click", () => {
    setStaffMenuOpen(staffNav.hidden);
});

staffMenuToggle.parentElement.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && staffMobileLayout.matches && !staffNav.hidden) {
        setStaffMenuOpen(false);
        staffMenuToggle.focus();
    }
});

staffNav.addEventListener("click", (event) => {
    const sectionLink = event.target.closest('a[href^="#"]');

    if (sectionLink && staffMobileLayout.matches && !event.ctrlKey && !event.metaKey &&
        !event.shiftKey && !event.altKey) {
        setStaffMenuOpen(false);
    }
});

staffMobileLayout.addEventListener("change", syncStaffMenu);
syncStaffMenu();
