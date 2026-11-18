const hero = document.querySelector(".hero");
const pointerMotion = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
);

// Keep the glow centered on the pointer inside the hero.
hero.addEventListener("pointermove", (event) => {
    if (!pointerMotion.matches || event.pointerType !== "mouse") {
        return;
    }

    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    hero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
});

const controls = document.querySelector("#directory-controls");
const searchInput = document.querySelector("#doctor-search");
const specialtySelect = document.querySelector("#doctor-specialty");
const resetButton = document.querySelector("#reset-filters");
const status = document.querySelector("#directory-status");

// Read names and specialties from the existing cards.
const doctors = Array.from(document.querySelectorAll("#doctor-grid .doctor-card"), (card) => ({
    card,
    name: card.querySelector("h3").textContent.trim().toLowerCase(),
    specialty: card.querySelector(".doctor-specialty").textContent.trim()
}));

const specialties = [...new Set(doctors.map((doctor) => doctor.specialty))].sort();

for (const specialty of specialties) {
    specialtySelect.add(new Option(specialty, specialty));
}

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

// Preview the directory states before the read-only API is connected.
const directoryPreview = new URLSearchParams(location.search).get("directory-preview");
const directoryGrid = document.querySelector("#doctor-grid");
const directoryRetry = document.querySelector("#directory-retry");

if (directoryPreview === "loading") {
    directoryGrid.hidden = true;
    status.textContent = "Loading doctors…";
    directoryRetry.hidden = false;
    directoryRetry.textContent = "Return to sample directory";
} else if (directoryPreview === "error") {
    directoryGrid.hidden = true;
    status.textContent = "The doctors directory is temporarily unavailable.";
    directoryRetry.hidden = false;
} else {
    filterDoctors();
    controls.hidden = false;
}
