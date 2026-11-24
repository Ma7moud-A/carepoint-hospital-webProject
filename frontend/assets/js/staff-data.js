// Fictional seed data for the staff previews. No login or real staff information is stored here.
const staffSeed = {
    departments: [
        { id: 1, name: "Cardiology", location: "Building A - Floor 2", phone: "02-2741001" },
        { id: 2, name: "Dermatology", location: "Building A - Floor 1", phone: "02-2741002" },
        { id: 3, name: "Pediatrics", location: "Building B - Floor 1", phone: "02-2741003" },
        { id: 4, name: "Neurology", location: "Building B - Floor 2", phone: "02-2741004" },
        { id: 5, name: "Orthopedics", location: "Building C - Floor 1", phone: "02-2741005" },
        { id: 6, name: "General Medicine", location: "Building A - Floor 3", phone: "02-2741006" }
    ],
    doctors: [
        { id: 1, firstName: "Ahmad", lastName: "Khalil", specialty: "Cardiology", departmentId: 1, phone: "059-500-0001", email: "doctor1@hospital.test" },
        { id: 2, firstName: "Lina", lastName: "Nasser", specialty: "Cardiology", departmentId: 1, phone: "059-500-0002", email: "doctor2@hospital.test" },
        { id: 3, firstName: "Sami", lastName: "Odeh", specialty: "Dermatology", departmentId: 2, phone: "059-500-0003", email: "doctor3@hospital.test" },
        { id: 4, firstName: "Rana", lastName: "Salem", specialty: "Dermatology", departmentId: 2, phone: "059-500-0004", email: "doctor4@hospital.test" },
        { id: 5, firstName: "Maha", lastName: "Yousef", specialty: "Pediatrics", departmentId: 3, phone: "059-500-0005", email: "doctor5@hospital.test" },
        { id: 6, firstName: "Fadi", lastName: "Haddad", specialty: "Pediatrics", departmentId: 3 },
        { id: 7, firstName: "Nour", lastName: "Issa", specialty: "Neurology", departmentId: 4 },
        { id: 8, firstName: "Omar", lastName: "Farah", specialty: "Orthopedics", departmentId: 5 },
        { id: 9, firstName: "Hala", lastName: "Mansour", specialty: "General Medicine", departmentId: 6 },
        { id: 10, firstName: "Kareem", lastName: "Awad", specialty: "Cardiology", departmentId: 1 }
    ],
    patients: [
        { id: 1, firstName: "Rania", lastName: "Haddad", birthDate: "1992-05-12", gender: "Female", bloodType: "A+", phone: "059-600-0001" },
        { id: 2, firstName: "Karim", lastName: "Mansour", birthDate: "2009-01-09", gender: "Male", bloodType: "O+" },
        { id: 3, firstName: "Nadine", lastName: "Nasser", birthDate: "1985-12-06", gender: "Female", bloodType: "B-" },
        { id: 4, firstName: "Lina", lastName: "Qasem", birthDate: "1998-10-04", gender: "Female", bloodType: "AB+" },
        { id: 5, firstName: "Omar", lastName: "Saleh", birthDate: "2012-08-11", gender: "Male" }
    ],
    appointments: [
        { id: 1, patientId: 1, doctorId: 1, dateTime: "2026-11-18T09:00", reason: "Routine checkup", status: "Completed" },
        { id: 2, patientId: 2, doctorId: 5, dateTime: "2026-11-18T09:30", reason: "Follow-up visit", status: "Completed" },
        { id: 3, patientId: 3, doctorId: 3, dateTime: "2026-11-18T10:15", reason: "Skin consultation", status: "Cancelled" },
        { id: 4, patientId: 4, doctorId: 1, dateTime: "2026-11-18T11:00", reason: "Follow-up visit", status: "Scheduled" },
        { id: 5, patientId: 5, doctorId: 5, dateTime: "2026-11-18T13:30", reason: "Routine checkup", status: "Scheduled" }
    ],
    records: [
        { id: 1, appointmentId: 1, date: "2026-11-18", symptoms: "None reported in this example.", diagnosis: "Routine review", treatment: "Follow-up as scheduled", notes: "Fictional demonstration record." }
    ],
    users: [
        { id: 1, username: "sample.admin", fullName: "System Administrator", role: "Administrator", active: true },
        { id: 2, username: "sample.reception", fullName: "Front Desk Receptionist", role: "Receptionist", active: true },
        { id: 3, username: "sample.doctor", fullName: "Dr. Ahmad Khalil", role: "Doctor", doctorId: 1, active: true }
    ],
    nextIds: { departments: 7, doctors: 11, patients: 6, appointments: 6, records: 2, users: 4 }
};

const staffStorageKey = "carepoint-staff-preview-v1";
let staffStorageAvailable = true;

function loadStaffData() {
    try {
        const saved = sessionStorage.getItem(staffStorageKey);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch {
        staffStorageAvailable = false;
    }

    return structuredClone(staffSeed);
}

const staffData = staffSession ? {
    departments: [], doctors: [], patients: [], appointments: [], records: [], users: [],
    ...staffSession.data
} : loadStaffData();
const previewDoctorId = staffSession ? staffSession.user.doctorId : 1;
if (staffSession) delete staffSession.data;
const sampleScheduleDate = "2026-11-18";
const appointmentStatuses = ["Scheduled", "Completed", "Cancelled"];

async function staffRequest(module, { filters = {}, action, id, data } = {}) {
    const query = new URLSearchParams({ module, ...filters });
    const options = action ? {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": staffSession.csrfToken },
        body: JSON.stringify({ action, id, data })
    } : {};
    const response = await fetch(`../backend/api/staff.php?${query}`, options);
    if (response.status === 401) location.replace("login.html");
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "The request could not be completed.");
    return result;
}

async function refreshStaffData(module) {
    const { data } = await staffRequest(module);
    for (const [collection, rows] of Object.entries(data)) {
        staffData[collection].splice(0, staffData[collection].length, ...rows);
    }
}

function saveStaffData() {
    try {
        sessionStorage.setItem(staffStorageKey, JSON.stringify(staffData));
    } catch {
        staffStorageAvailable = false;
    }
}

function staffFind(collection, id) {
    return staffData[collection].find((row) => row.id === Number(id));
}

function personName(person) {
    return person ? `${person.firstName} ${person.lastName}` : "Not listed";
}

function doctorName(id) {
    const doctor = staffFind("doctors", id);
    return doctor ? `Dr. ${personName(doctor)}` : "Not listed";
}

function patientName(id) {
    return personName(staffFind("patients", id));
}

function departmentName(id) {
    return staffFind("departments", id)?.name ?? "Not listed";
}

function formatStaffDate(date) {
    return new Date(`${date}T12:00`).toLocaleDateString("en", { dateStyle: "medium" });
}

function formatStaffVisit(dateTime) {
    return `${formatStaffDate(dateTime.slice(0, 10))} · ${dateTime.slice(11, 16)}`;
}

window.addEventListener("pageshow", (event) => {
    if (event.persisted && staffStorageAvailable) location.reload();
});
