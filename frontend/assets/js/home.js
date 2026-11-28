const welcomeHero = document.querySelector(".hero");
const hoverMotion = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
);

welcomeHero.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !hoverMotion.matches) return;

    const bounds = welcomeHero.getBoundingClientRect();
    welcomeHero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    welcomeHero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    welcomeHero.classList.add("is-pointer-active");
});

function clearPointerShade() {
    welcomeHero.classList.remove("is-pointer-active");
}

welcomeHero.addEventListener("pointerleave", clearPointerShade);
welcomeHero.addEventListener("pointercancel", clearPointerShade);
hoverMotion.addEventListener("change", clearPointerShade);

const teamScene = document.querySelector(".team-scene");
const sceneFrame = teamScene.querySelector(".scene-frame");
const frameRoute = sceneFrame.querySelector("#scene-frame-route");
const frameSignal = sceneFrame.querySelector(".scene-frame-signal");
const frameArrow = sceneFrame.querySelector(".scene-frame-arrow");
const frameMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
const lapDuration = 4800;
let routeLength;
let frameRequest;

function fitSceneFrame() {
    const { width, height } = teamScene.getBoundingClientRect();
    const inset = 2;
    const right = width - inset;
    const bottom = height - inset;
    const radius = parseFloat(getComputedStyle(teamScene).borderTopLeftRadius) - inset;
    const near = inset + radius;
    const far = right - radius;
    const low = bottom - radius;
    const pulse = Math.round(width * 0.25);
    const heart = Math.round(width * 0.76);

    sceneFrame.setAttribute("viewBox", `0 0 ${width} ${height}`);
    frameRoute.setAttribute("d", [
        `M${near} ${inset} H${pulse}`,
        "l8 -6 8 4 12 -20 13 20 10 2",
        `H${heart - 5} c-3 -5 -12 -12 -12 -20 c0 -9 10 -12 17 -5 c7 -7 17 -4 17 5 c0 8 -9 15 -12 20`,
        `H${far} Q${right} ${inset} ${right} ${near}`,
        `V${low} Q${right} ${bottom} ${far} ${bottom}`,
        `H${near} Q${inset} ${bottom} ${inset} ${low}`,
        `V${near} Q${inset} ${inset} ${near} ${inset} Z`
    ].join(" "));
    routeLength = frameRoute.getTotalLength();
}

function moveFrameSignal(time) {
    const progress = (time % lapDuration) / lapDuration;
    const distance = progress * routeLength;
    const tip = frameRoute.getPointAtLength(distance);
    const tail = frameRoute.getPointAtLength((distance + routeLength - 2) % routeLength);
    const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x) * 180 / Math.PI;

    // The arrow tip and the end of the trail share the same point on the route.
    frameSignal.style.strokeDashoffset = 12 - progress * 100;
    frameArrow.setAttribute("transform", `translate(${tip.x} ${tip.y}) rotate(${angle})`);
    frameRequest = requestAnimationFrame(moveFrameSignal);
}

function updateFrameMotion() {
    cancelAnimationFrame(frameRequest);
    sceneFrame.classList.toggle("is-running", frameMotion.matches);
    if (frameMotion.matches) {
        moveFrameSignal(performance.now());
    } else {
        frameSignal.style.removeProperty("stroke-dashoffset");
    }
}

fitSceneFrame();
new ResizeObserver(fitSceneFrame).observe(teamScene);
updateFrameMotion();
frameMotion.addEventListener("change", updateFrameMotion);

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
