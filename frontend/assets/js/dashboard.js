const dashboardSession = staffSession;
const dashboardDoctorId = dashboardSession ? dashboardSession.user.doctorId : previewDoctorId;
const dateFilter = document.querySelector("#dashboard-date");
if (dashboardSession) {
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Hebron",
        year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    dateFilter.value = `${date.year}-${date.month}-${date.day}`;
}

const views = {
    administrator: {
        title: "Hospital overview",
        description: "Review hospital activity and the day's appointment schedule.",
        metrics: (totals) => [["Departments", staffData.totals?.departments ?? staffData.departments.length],
            ["Doctors", staffData.totals?.doctors ?? staffData.doctors.length], ["Scheduled visits", totals.Scheduled]],
        tools: [
            ["Departments", "Manage hospital departments."],
            ["Doctors", "Manage profiles and department assignments."],
            ["Patients", "Manage patient information."],
            ["Appointments", "Manage visits across departments."],
            ["Medical Records", "Manage records tied to patient visits."],
            ["User Management", "Manage staff accounts and roles."]
        ]
    },
    receptionist: {
        title: "Reception desk",
        description: "Review the day's visits and see which patients are scheduled.",
        metrics: (totals) => [["Scheduled visits", totals.Scheduled], ["Completed visits", totals.Completed],
            ["Cancelled visits", totals.Cancelled]],
        tools: [
            ["Departments", "Look up departments and locations."],
            ["Doctors", "Find doctors by specialty."],
            ["Patients", "Register patients and update their details."],
            ["Appointments", "Schedule visits and update their status."]
        ]
    },
    doctor: {
        title: "Doctor workspace",
        description: `View the schedule assigned to ${doctorName(dashboardDoctorId)}.`,
        metrics: (totals, count) => [["Assigned visits", count], ["Scheduled visits", totals.Scheduled],
            ["Completed visits", totals.Completed]],
        tools: [
            ["Appointments", "Review assigned visits."],
            ["Patients", "View patients on your schedule."],
            ["Medical Records", "Review patient histories and document visits."]
        ]
    }
};

const role = document.querySelector("#preview-role");
const statusFilter = document.querySelector("#appointment-status");
const heading = document.querySelector("#dashboard-title");
const description = document.querySelector("#dashboard-description");
const metrics = document.querySelector("#dashboard-metrics");
const appointmentList = document.querySelector("#appointment-list");
const appointmentCount = document.querySelector("#appointment-count");
const toolList = document.querySelector("#staff-tool-list");

function getRoleAppointments() {
    const date = dashboardSession ? dateFilter.value : sampleScheduleDate;
    return staffData.appointments.filter((appointment) => date && appointment.dateTime.startsWith(date) &&
        (role.value !== "doctor" || appointment.doctorId === dashboardDoctorId))
        .sort((first, second) => first.dateTime.localeCompare(second.dateTime));
}

function renderAppointments() {
    const appointments = getRoleAppointments().filter((appointment) =>
        !statusFilter.value || appointment.status === statusFilter.value);

    appointmentList.replaceChildren();

    for (const appointment of appointments) {
        const row = document.createElement("li");
        row.className = "appointment-row";

        const time = document.createElement("time");
        time.className = "appointment-time";
        time.dateTime = appointment.dateTime;
        time.textContent = appointment.dateTime.slice(11, 16);

        const details = document.createElement("div");
        const patient = document.createElement("strong");
        patient.textContent = patientName(appointment.patientId);
        const doctor = document.createElement("p");
        doctor.className = "appointment-doctor";
        doctor.textContent = doctorName(appointment.doctorId);
        details.append(patient, doctor);

        const badge = document.createElement("span");
        badge.className = "appointment-badge";
        badge.dataset.status = appointment.status;
        badge.textContent = appointment.status;

        row.append(time, details, badge);
        appointmentList.append(row);
    }

    const count = appointments.length;
    const label = count === 1 ? "appointment" : "appointments";
    appointmentCount.textContent = count ? `${count} ${label} shown` : "No appointments match this status.";
}

function renderRole() {
    const view = views[role.value];
    const appointments = getRoleAppointments();
    const totals = { Scheduled: 0, Completed: 0, Cancelled: 0 };

    for (const appointment of appointments) {
        totals[appointment.status] += 1;
    }

    heading.textContent = view.title;
    description.textContent = view.description;
    updateStaffNavigation(role.value, "dashboard");
    metrics.replaceChildren();
    toolList.replaceChildren();

    for (const [label, count] of view.metrics(totals, appointments.length)) {
        const card = document.createElement("div");
        card.className = "staff-card";
        const term = document.createElement("dt");
        term.textContent = label;
        const value = document.createElement("dd");
        value.textContent = count;
        card.append(term, value);
        metrics.append(card);
    }

    for (const [title, summary] of view.tools) {
        const item = document.createElement("li");
        const name = document.createElement("h3");
        const page = staffPages.find(({ label }) => label === title);
        const link = document.createElement("a");
        link.href = staffPageUrl(page.id, role.value);
        link.textContent = title;
        name.append(link);
        const details = document.createElement("p");
        details.textContent = summary;
        item.append(name, details);
        toolList.append(item);
    }

    statusFilter.value = "";
    renderAppointments();
}

role.value = dashboardSession ? dashboardSession.user.role.toLowerCase() : getStaffPreviewRole();
role.addEventListener("change", renderRole);
statusFilter.addEventListener("change", renderAppointments);
renderRole();
metrics.hidden = false;
document.querySelector("#role-field").hidden = Boolean(dashboardSession);
if (dashboardSession) {
    const { fullName, role: accountRole } = dashboardSession.user;
    document.querySelector("#dashboard-eyebrow").textContent = `${fullName} · ${accountRole}`;
    document.querySelector(".dashboard-preview-bar").hidden = true;
    document.querySelector('a[href="#appointments"]').textContent = "Appointment schedule";
    document.querySelector("#appointments-title").textContent = "Appointments";
    appointmentList.setAttribute("aria-label", "Appointments by time");
    document.querySelector("#appointments time").parentElement.hidden = true;
    document.querySelector("#dashboard-date-field").hidden = false;
    dateFilter.addEventListener("change", renderRole);
    const logout = document.querySelector("#dashboard-logout");
    logout.hidden = false;
    logout.addEventListener("click", async () => {
        logout.disabled = true;
        try {
            const response = await fetch("../backend/api/auth/logout.php", {
                method: "POST",
                headers: { "X-CSRF-Token": dashboardSession.csrfToken }
            });
            if (!response.ok) throw new Error();
            location.replace("login.html");
        } catch {
            document.querySelector("#dashboard-reset-feedback").textContent =
                "Could not sign out. Refresh the dashboard and try again.";
            logout.disabled = false;
        }
    });
}
document.querySelector("#status-field").hidden = false;

const resetSamples = document.querySelector("#dashboard-reset");
resetSamples.hidden = Boolean(dashboardSession);
resetSamples.addEventListener("click", () => {
    if (window.confirm("Restore the fictional sample data in this tab? Sample edits will be discarded.")) {
        Object.assign(staffData, structuredClone(staffSeed));
        saveStaffData();
        renderRole();
        document.querySelector("#dashboard-reset-feedback").textContent = "Sample data restored.";
    }
});

const weatherState = document.querySelector("#weather-state");
const weatherStatus = document.querySelector("#weather-status");
const weatherRetry = document.querySelector("#weather-retry");

function renderWeatherPreview() {
    const message = {
        ready: "18 °C · Partly cloudy",
        loading: "Loading weather…",
        error: "Weather is temporarily unavailable."
    };
    weatherStatus.textContent = message[weatherState.value];
    weatherRetry.hidden = weatherState.value !== "error";
}

async function loadWeather() {
    weatherStatus.textContent = "Loading Bethlehem weather…";
    weatherRetry.hidden = true;
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=31.71&longitude=35.20&current=temperature_2m,wind_speed_10m",
            { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error();
        const { current } = await response.json();
        if (!Number.isFinite(current?.temperature_2m) || !Number.isFinite(current?.wind_speed_10m)) throw new Error();
        weatherStatus.textContent = `${current.temperature_2m} °C · Wind ${current.wind_speed_10m} km/h`;
    } catch {
        weatherStatus.textContent = "Weather is temporarily unavailable.";
        weatherRetry.hidden = false;
    }
}

if (dashboardSession) {
    weatherState.parentElement.hidden = true;
    const source = document.createElement("a");
    source.href = "https://open-meteo.com/";
    source.textContent = "Weather data by Open-Meteo";
    document.querySelector(".weather-caption").replaceChildren(source);
    weatherRetry.textContent = "Retry weather";
    weatherRetry.addEventListener("click", loadWeather);
    loadWeather();
} else {
    weatherState.addEventListener("change", renderWeatherPreview);
    weatherRetry.addEventListener("click", () => {
        weatherState.value = "ready";
        renderWeatherPreview();
        weatherState.focus();
    });
    renderWeatherPreview();
}
document.querySelector("#weather-preview").hidden = false;
