const hero = document.querySelector(".hero");
const pointerMotion = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
);

hero.addEventListener("pointermove", (event) => {
    if (!pointerMotion.matches || event.pointerType !== "mouse") return;

    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    hero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    hero.classList.add("hero-pointer-active");
});

hero.addEventListener("pointerleave", () => {
    hero.classList.remove("hero-pointer-active");
});

const controls = document.querySelector("#directory-controls");
const searchInput = document.querySelector("#doctor-search");
const specialtySelect = document.querySelector("#doctor-specialty");
const resetButton = document.querySelector("#reset-filters");
const status = document.querySelector("#directory-status");

const doctors = [];

// Apply both filters together and update the result count.
function filterDoctors() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedSpecialty = specialtySelect.value;
    let visibleCount = 0;

    for (const doctor of doctors) {
        const matchesName = doctor.name.includes(searchText);
        const matchesSpecialty = !selectedSpecialty || doctor.specialty === selectedSpecialty;
        const isVisible = matchesName && matchesSpecialty;

        doctor.card.hidden = !isVisible;

        if (isVisible) {
            visibleCount += 1;
        }
    }

    if (visibleCount === 0) {
        status.textContent = "No doctors match your filters.";
    } else {
        const label = visibleCount === 1 ? "doctor" : "doctors";
        status.textContent = `${visibleCount} ${label} shown`;
    }
}

searchInput.addEventListener("input", filterDoctors);
specialtySelect.addEventListener("change", filterDoctors);

resetButton.addEventListener("click", () => {
    searchInput.value = "";
    specialtySelect.value = "";
    filterDoctors();
    searchInput.focus();
});

const directoryGrid = document.querySelector("#doctor-grid");
const directoryRetry = document.querySelector("#directory-retry");

function doctorCard(doctor) {
    const card = document.createElement("li");
    card.className = "doctor-card";
    const initials = document.createElement("span");
    initials.className = "doctor-avatar";
    initials.setAttribute("aria-hidden", "true");
    initials.textContent = (doctor.firstName[0] + doctor.lastName[0]).toUpperCase();
    const name = document.createElement("h3");
    name.textContent = `Dr. ${doctor.firstName} ${doctor.lastName}`;
    const specialty = document.createElement("p");
    specialty.className = "doctor-specialty";
    specialty.textContent = doctor.specialty;
    const location = document.createElement("p");
    location.className = "doctor-location";
    location.textContent = [doctor.department, doctor.location].filter(Boolean).join(" · ");
    card.append(initials, name, specialty, location);
    return { card, name: name.textContent.toLowerCase(), specialty: doctor.specialty };
}

async function loadDoctors() {
    controls.hidden = true;
    directoryRetry.hidden = true;
    directoryGrid.replaceChildren();
    doctors.length = 0;
    status.textContent = "Loading doctors…";
    try {
        const response = await fetch("../backend/api/public/doctors.php");
        if (!response.ok) throw new Error();
        const result = await response.json();
        doctors.push(...result.doctors.map(doctorCard));
        directoryGrid.replaceChildren(...doctors.map(({ card }) => card));
        const selectedSpecialty = specialtySelect.value;
        specialtySelect.replaceChildren(new Option("All specialties", ""));
        const specialties = [...new Set(doctors.map(({ specialty }) => specialty))].sort();
        for (const specialty of specialties) specialtySelect.add(new Option(specialty, specialty));
        if (specialties.includes(selectedSpecialty)) specialtySelect.value = selectedSpecialty;
        controls.hidden = doctors.length === 0;
        filterDoctors();
        if (!doctors.length) status.textContent = "No doctors are listed yet.";
    } catch {
        status.textContent = "The doctors directory is temporarily unavailable.";
        directoryRetry.hidden = false;
    }
}

directoryRetry.addEventListener("click", loadDoctors);
loadDoctors();
