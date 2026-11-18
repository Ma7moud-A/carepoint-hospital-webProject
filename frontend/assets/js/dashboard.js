const views = {
    administrator: {
        title: "Hospital overview",
        description: "Review hospital activity and the day's appointment schedule.",
        metrics: (totals) => [["Departments", staffData.departments.length], ["Doctors", staffData.doctors.length], ["Scheduled visits", totals.Scheduled]],
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
        description: `View the sample schedule assigned to ${doctorName(previewDoctorId)}.`,
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
    return staffData.appointments.filter((appointment) => appointment.dateTime.startsWith(sampleScheduleDate) &&
        (role.value !== "doctor" || appointment.doctorId === previewDoctorId))
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

role.value = getStaffPreviewRole();
role.addEventListener("change", renderRole);
statusFilter.addEventListener("change", renderAppointments);
renderRole();
metrics.hidden = false;
document.querySelector("#role-field").hidden = false;
document.querySelector("#status-field").hidden = false;

const resetSamples = document.querySelector("#dashboard-reset");
resetSamples.hidden = false;
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

weatherState.addEventListener("change", renderWeatherPreview);
weatherRetry.addEventListener("click", () => {
    weatherState.value = "ready";
    renderWeatherPreview();
    weatherState.focus();
});
renderWeatherPreview();
document.querySelector("#weather-preview").hidden = false;
