const departments = staffData.departments;
let editingDepartment = null;
let deletingDepartment = null;

const departmentRole = document.querySelector("#department-role");
const search = document.querySelector("#department-search");
const clearSearch = document.querySelector("#department-clear");
const addButton = document.querySelector("#department-add");
const list = document.querySelector("#department-list");
const cardTemplate = document.querySelector("#department-card-template");
const results = document.querySelector("#department-results");
const feedback = document.querySelector("#department-feedback");
const editor = document.querySelector("#department-editor");
const form = document.querySelector("#department-form");
const nameInput = document.querySelector("#department-name");
const locationInput = document.querySelector("#department-location");
const phoneInput = document.querySelector("#department-phone");
const nameError = document.querySelector("#department-name-error");
const deletion = document.querySelector("#department-deletion");
const cancelDelete = document.querySelector("#department-cancel-delete");
const confirmDelete = document.querySelector("#department-confirm-delete");

function canManageDepartments() {
    return departmentRole.value === "administrator";
}

function assignedDoctorCount(department) {
    if (staffSession) return department.doctorCount;
    return staffData.doctors.filter((doctor) => doctor.departmentId === department.id).length;
}

function matchesDepartment(department, query) {
    return [department.name, department.location, department.phone, String(department.id)]
        .some((value) => value.toLowerCase().includes(query));
}

let departmentSearchVersion = 0;
let departmentBusy = false;

async function renderDepartments() {
    const version = ++departmentSearchVersion;
    const query = search.value.trim().toLowerCase();
    let visible = departments;
    if (staffSession && query) {
        try {
            const { ids } = await staffRequest("departments", { filters: { search: query } });
            if (version !== departmentSearchVersion) return;
            const matching = new Set(ids);
            visible = departments.filter(({ id }) => matching.has(id));
        } catch (error) {
            if (version === departmentSearchVersion) results.textContent = error.message;
            return;
        }
    } else if (!staffSession) {
        visible = departments.filter((department) => matchesDepartment(department, query));
    }
    const canManage = canManageDepartments();
    list.replaceChildren();
    addButton.hidden = !canManage;
    clearSearch.disabled = search.value.length === 0;

    for (const department of visible) {
        const card = cardTemplate.content.firstElementChild.cloneNode(true);
        const title = card.querySelector("h3");
        const editButton = card.querySelector(".department-edit");
        const deleteButton = card.querySelector(".department-delete");
        title.id = `department-title-${department.id}`;
        title.textContent = department.name;
        card.querySelector(".department-id").textContent = `ID ${department.id}`;
        card.querySelector(".department-location").textContent = department.location || "Not listed";
        card.querySelector(".department-phone").textContent = department.phone || "Not listed";
        card.querySelector(".department-doctors").textContent = assignedDoctorCount(department);
        card.querySelector(".department-actions").hidden = !canManage;
        editButton.setAttribute("aria-label", `Edit ${department.name}`);
        deleteButton.setAttribute("aria-label", `Delete ${department.name}`);
        editButton.addEventListener("click", () => openEditor(department));
        deleteButton.addEventListener("click", () => openDeletion(department));
        list.append(card);
    }

    const count = visible.length;
    const label = count === 1 ? "department" : "departments";
    results.dataset.empty = String(count === 0);

    if (count > 0) {
        results.textContent = `${count} ${label} shown`;
    } else {
        results.textContent = query ? "No departments match your search." : "No departments have been added.";
    }
}

function setNameError(message) {
    nameError.textContent = message;

    if (message) {
        nameInput.setAttribute("aria-invalid", "true");
        nameInput.focus();
    } else {
        nameInput.removeAttribute("aria-invalid");
    }
}

function openEditor(department = null) {
    if (!canManageDepartments()) {
        return;
    }

    editingDepartment = department;
    document.querySelector("#department-editor-title").textContent = department ? "Edit department" : "Add department";
    document.querySelector("#department-save").textContent = department ? "Save changes" : "Add department";
    nameInput.value = department?.name ?? "";
    locationInput.value = department?.location ?? "";
    phoneInput.value = department?.phone ?? "";
    setNameError("");
    editor.showModal();
}

function openDeletion(department) {
    if (!canManageDepartments()) {
        return;
    }

    deletingDepartment = department;
    const assigned = assignedDoctorCount(department) > 0;
    document.querySelector("#department-deletion-title").textContent = assigned ? "Department has assigned doctors" : "Delete department";
    document.querySelector("#department-deletion-description").textContent = assigned
        ? `Reassign all doctors before deleting ${department.name}.`
        : `Delete ${department.name} from this preview? This action cannot be undone.`;
    confirmDelete.hidden = assigned;
    cancelDelete.textContent = assigned ? "Close" : "Cancel";
    deletion.showModal();
}

async function saveLiveDepartment(action, id, data) {
    if (departmentBusy) return;
    departmentBusy = true;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    confirmDelete.disabled = true;
    let saved = false;
    try {
        await staffRequest("departments", { action, id, data });
        saved = true;
        if (editor.open) editor.close();
        if (deletion.open) deletion.close();
        await refreshStaffData("departments");
        await renderDepartments();
        feedback.textContent = action === "delete" ? "Department deleted." : "Department saved.";
    } catch (error) {
        if (saved) feedback.textContent = "Changes saved. Reload the page to see the latest data.";
        else if (editor.open) setNameError(error.message);
        else {
            if (deletion.open) deletion.close();
            feedback.textContent = error.message;
        }
    } finally {
        departmentBusy = false;
        submit.disabled = false;
        confirmDelete.disabled = false;
    }
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!canManageDepartments()) {
        return;
    }

    const name = nameInput.value.trim();

    if (!name) {
        setNameError("Enter a department name.");
        return;
    }

    if (staffSession) {
        saveLiveDepartment(editingDepartment ? "update" : "create", editingDepartment?.id,
            { name, location: locationInput.value.trim(), phone: phoneInput.value.trim() });
        return;
    }

    const hasDuplicate = departments.some((department) => department !== editingDepartment &&
        department.name.localeCompare(name, "en", { sensitivity: "base" }) === 0);

    if (hasDuplicate) {
        setNameError("A department with this name already exists.");
        return;
    }

    const department = editingDepartment ?? { id: staffData.nextIds.departments++ };
    department.name = name;
    department.location = locationInput.value.trim();
    department.phone = phoneInput.value.trim();

    if (!editingDepartment) {
        departments.push(department);
    }

    saveStaffData();

    if (!matchesDepartment(department, search.value.trim().toLowerCase())) {
        search.value = "";
    }

    editor.close();
    renderDepartments();
    feedback.textContent = editingDepartment ? `${name} updated.` : `${name} added.`;
    document.getElementById(`department-title-${department.id}`).focus();
});

confirmDelete.addEventListener("click", () => {
    if (!canManageDepartments() || !deletion.open || !deletingDepartment || assignedDoctorCount(deletingDepartment) > 0) {
        return;
    }

    if (staffSession) {
        saveLiveDepartment("delete", deletingDepartment.id);
        return;
    }
    departments.splice(departments.indexOf(deletingDepartment), 1);
    saveStaffData();
    deletion.close();
    renderDepartments();
    feedback.textContent = `${deletingDepartment.name} deleted.`;
    search.focus();
});

search.addEventListener("input", () => {
    feedback.textContent = "";
    renderDepartments();
});
clearSearch.addEventListener("click", () => {
    search.value = "";
    feedback.textContent = "";
    renderDepartments();
    search.focus();
});
addButton.addEventListener("click", () => openEditor());
nameInput.addEventListener("input", () => setNameError(""));
document.querySelector("#department-cancel-edit").addEventListener("click", () => editor.close());
cancelDelete.addEventListener("click", () => deletion.close());

function updateDepartmentRole() {
    updateStaffNavigation(departmentRole.value, "departments");
    const allowed = departmentRole.value !== "doctor";
    document.querySelector("#department-directory").hidden = !allowed;
    document.querySelector("#department-unavailable").hidden = allowed;
    feedback.textContent = "";
    renderDepartments();
}

departmentRole.value = staffSession ? staffSession.user.role.toLowerCase() : getStaffPreviewRole();
departmentRole.addEventListener("change", updateDepartmentRole);
updateDepartmentRole();
document.querySelector("#department-role-field").hidden = Boolean(staffSession);
if (staffSession) {
    document.querySelector(".staff-main .eyebrow").textContent = staffSession.user.role;
    document.querySelector("#department-preview-note").hidden = true;
} else if (!staffStorageAvailable) {
    document.querySelector("#department-preview-note").textContent = "Fictional data. This browser keeps sample edits on this page only.";
}
