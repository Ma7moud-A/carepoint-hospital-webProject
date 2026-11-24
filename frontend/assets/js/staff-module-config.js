const allStaffRoles = ["administrator", "receptionist", "doctor"];
const deskRoles = ["administrator", "receptionist"];
const clinicalRoles = ["administrator", "doctor"];
const adminRole = ["administrator"];

function textField(key, label, maxLength, required = false, type = "text") {
    return { key, label, maxLength, required, type };
}

function selectField(key, label, options, required = true) {
    return { key, label, options, required, type: "select" };
}

function referenceOptions(collection, label) {
    return staffData[collection].map((row) => [row.id, label(row)]);
}

function appointmentLabel(appointment) {
    return `#${appointment.id} · ${patientName(appointment.patientId)} · ${doctorName(appointment.doctorId)} · ${formatStaffVisit(appointment.dateTime)}`;
}

function hasDuplicate(collection, key, value, original) {
    return value && staffData[collection].some((row) => row !== original &&
        row[key]?.localeCompare(value, "en", { sensitivity: "base" }) === 0);
}

function canSeeAppointment(appointment, role) {
    return role !== "doctor" || appointment.doctorId === previewDoctorId;
}

function todayForForm() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 10);
}

const staffModules = {
    doctors: {
        collection: "doctors", singular: "doctor", plural: "doctors", add: "Add doctor",
        view: deskRoles, edit: adminRole, remove: adminRole,
        title: (row) => doctorName(row.id), subtitle: (row) => row.specialty,
        search: (row) => [doctorName(row.id)], searchLabel: "Doctor name or ID",
        filters: () => [
            selectField("specialty", "Specialty", [...new Set(staffData.doctors.map((row) => row.specialty))].sort()),
            selectField("departmentId", "Department", referenceOptions("departments", (row) => row.name))
        ],
        details: (row) => [["Department", departmentName(row.departmentId)], ["Phone", row.phone], ["Email", row.email]],
        fields: () => [
            textField("firstName", "First name", 50, true), textField("lastName", "Last name", 50, true),
            textField("specialty", "Specialty", 100, true),
            selectField("departmentId", "Department", referenceOptions("departments", (row) => row.name)),
            textField("phone", "Phone", 25, false, "tel"), textField("email", "Email", 120, false, "email")
        ],
        validate: (row, original) => hasDuplicate("doctors", "email", row.email, original) ? "A doctor already uses this email." : "",
        deleteBlock: (row) => staffData.appointments.some((visit) => visit.doctorId === row.id) ||
            staffData.users.some((user) => user.doctorId === row.id) ? "This doctor is linked to an appointment or staff account." : ""
    },
    patients: {
        collection: "patients", singular: "patient", plural: "patients", add: "Register patient",
        view: allStaffRoles, edit: deskRoles, remove: adminRole,
        visible: (row, role) => staffData.appointments.some((visit) => visit.patientId === row.id && canSeeAppointment(visit, role)) || role !== "doctor",
        title: personName, search: (row) => [personName(row)], searchLabel: "Patient name or ID",
        details: (row) => [["Date of birth", formatStaffDate(row.birthDate)], ["Gender", row.gender],
            ["Blood type", row.bloodType], ["Phone", row.phone], ["Email", row.email], ["Address", row.address]],
        fields: () => [
            textField("firstName", "First name", 50, true), textField("lastName", "Last name", 50, true),
            { key: "birthDate", label: "Date of birth", type: "date", max: todayForForm(), required: true },
            selectField("gender", "Gender", ["Female", "Male", "Other"]),
            selectField("bloodType", "Blood type", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], false),
            textField("phone", "Phone", 25, false, "tel"), textField("email", "Email", 120, false, "email"),
            textField("address", "Address", 255)
        ],
        validate: (row, original) => hasDuplicate("patients", "email", row.email, original) ? "A patient already uses this email." : "",
        deleteBlock: (row) => staffData.appointments.some((visit) => visit.patientId === row.id) ? "This patient is linked to an appointment." : ""
    },
    appointments: {
        collection: "appointments", singular: "appointment", plural: "appointments", add: "Schedule appointment",
        view: allStaffRoles, edit: deskRoles, remove: adminRole, visible: canSeeAppointment,
        title: (row) => patientName(row.patientId), subtitle: (row) => doctorName(row.doctorId),
        badge: (row) => row.status, search: (row) => [patientName(row.patientId), doctorName(row.doctorId)],
        searchLabel: "Patient, doctor, or appointment ID",
        filters: (role) => [
            { key: "dateTime", label: "Visit date", type: "date" },
            selectField("status", "Status", appointmentStatuses),
            ...(role === "doctor" ? [] : [selectField("doctorId", "Doctor", referenceOptions("doctors", (row) => doctorName(row.id)))])
        ],
        details: (row) => [["Visit", formatStaffVisit(row.dateTime)], ["Reason", row.reason]],
        fields: (original) => {
            const linkedRecord = original && (original.hasRecord || staffData.records.some((row) => row.appointmentId === original.id));
            return [
                { ...selectField("patientId", "Patient", referenceOptions("patients", personName)), disabled: linkedRecord },
                { ...selectField("doctorId", "Doctor", referenceOptions("doctors", (row) => doctorName(row.id))), disabled: linkedRecord },
                { key: "dateTime", label: "Visit date and time", type: "datetime-local", required: true },
                { ...selectField("status", "Status", appointmentStatuses), default: "Scheduled" },
                textField("reason", "Visit reason", 255)
            ];
        },
        deleteBlock: (row) => row.hasRecord || staffData.records.some((record) => record.appointmentId === row.id) ? "This appointment has a medical record." : ""
    },
    "medical-records": {
        collection: "records", singular: "medical record", plural: "medical records", add: "Add medical record",
        view: clinicalRoles, edit: clinicalRoles, remove: adminRole,
        visible: (row, role) => canSeeAppointment(staffFind("appointments", row.appointmentId), role),
        title: (row) => patientName(staffFind("appointments", row.appointmentId).patientId),
        subtitle: (row) => `Appointment #${row.appointmentId}`,
        searchLabel: "Patient name or appointment ID",
        search: (row) => [patientName(staffFind("appointments", row.appointmentId).patientId), String(row.appointmentId)],
        details: (row) => [["Doctor", doctorName(staffFind("appointments", row.appointmentId).doctorId)],
            ["Record date", formatStaffDate(row.date)], ["Symptoms", row.symptoms], ["Diagnosis", row.diagnosis],
            ["Treatment", row.treatment], ["Notes", row.notes]],
        fields: (original, role) => {
            const eligible = staffData.appointments.filter((visit) => canSeeAppointment(visit, role) &&
                (original ? visit.id === original.appointmentId : !staffData.records.some((row) => row.appointmentId === visit.id)));
            return [
                { ...selectField("appointmentId", "Related appointment", eligible.map((visit) => [visit.id, appointmentLabel(visit)])), disabled: Boolean(original) },
                { key: "date", label: "Record date", type: "date", default: todayForForm(), required: true },
                ...["Symptoms", "Diagnosis", "Treatment", "Notes"].map((label) => ({ key: label.toLowerCase(), label, type: "textarea" }))
            ];
        },
        unavailableAdd: (role) => !staffData.appointments.some((visit) => canSeeAppointment(visit, role) &&
            !staffData.records.some((row) => row.appointmentId === visit.id)) ? "There are no eligible appointments without a medical record." : ""
    },
    users: {
        collection: "users", singular: "user", plural: "users", add: "Add staff account",
        view: adminRole, edit: adminRole, remove: [], accountActions: true,
        title: (row) => row.fullName, subtitle: (row) => row.username, badge: (row) => row.active ? "Active" : "Inactive",
        search: (row) => [row.fullName, row.username], searchLabel: "Name, username, or ID",
        filters: () => [selectField("role", "Account role", ["Administrator", "Receptionist", "Doctor"])],
        details: (row) => [["Role", row.role], ...(row.doctorId ? [["Assigned doctor", doctorName(row.doctorId)]] : [])],
        fields: () => [
            textField("username", "Username", 50, true), textField("fullName", "Full name", 120, true),
            selectField("role", "Account role", ["Administrator", "Receptionist", "Doctor"]),
            { ...selectField("doctorId", "Linked doctor", referenceOptions("doctors", (row) => doctorName(row.id))), doctorOnly: true }
        ],
        validate: (row, original) => {
            if (hasDuplicate("users", "username", row.username, original)) return "This username is already in use.";
            if (row.doctorId && staffData.users.some((user) => user !== original && user.doctorId === row.doctorId)) return "This doctor is already linked to a staff account.";
            return "";
        }
    }
};
