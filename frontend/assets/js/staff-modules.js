const currentModule = document.body.dataset.module;
const moduleConfig = staffModules[currentModule];
const moduleRows = staffData[moduleConfig.collection];
const moduleRole = document.querySelector("#module-role");
const moduleDirectory = document.querySelector("#module-directory");
const moduleList = document.querySelector("#module-list");
const moduleResults = document.querySelector("#module-results");
const moduleFeedback = document.querySelector("#module-feedback");
const moduleFilters = document.querySelector("#module-filters");
const moduleAdd = document.querySelector("#module-add");
const moduleEditor = document.querySelector("#module-editor");
const moduleForm = document.querySelector("#module-form");
const moduleFields = document.querySelector("#module-fields");
const moduleError = document.querySelector("#module-error");
const moduleConfirmation = document.querySelector("#module-confirmation");
const moduleConfirm = document.querySelector("#module-confirm-action");
const moduleCancel = document.querySelector("#module-cancel-confirmation");
const moduleSearchField = { key: "search", label: moduleConfig.searchLabel, type: "search" };
let filterFields = [];
let editFields = [];
let editingRow;
let confirmAction;

function element(tag, text = "", className = "") {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}

function makeModuleField(field, prefix, value = "", isFilter = false) {
    const wrapper = element("div", "", "staff-field");
    const id = `${prefix}-${field.key}`;
    const label = element("label", field.label);
    label.htmlFor = id;
    let control;

    if (field.type === "select") {
        control = document.createElement("select");
        control.add(new Option(isFilter ? "Any" : "Select an option", ""));

        for (const option of field.options) {
            const [optionValue, optionLabel] = Array.isArray(option) ? option : [option, option];
            control.add(new Option(optionLabel, optionValue));
        }
    } else if (field.type === "textarea") {
        control = document.createElement("textarea");
        control.rows = 3;
    } else {
        control = document.createElement("input");
        control.type = field.type;
        if (field.maxLength) control.maxLength = field.maxLength;
        if (field.max) control.max = field.max;
    }

    control.id = id;
    control.required = !isFilter && Boolean(field.required);
    control.disabled = Boolean(field.disabled);
    control.value = value;
    wrapper.append(label, control);
    return { ...field, wrapper, control };
}

function isVisibleToRole(row) {
    return !moduleConfig.visible || moduleConfig.visible(row, moduleRole.value);
}

function matchesModuleFilters(row) {
    const query = filterFields[0].control.value.trim().toLowerCase();
    const numberQuery = /^#?\d+$/.test(query);
    const searchText = moduleConfig.search(row);
    const matchesSearch = numberQuery
        ? [String(row.id), ...searchText].includes(query.replace(/^#/, ""))
        : searchText.some((text) => text.toLowerCase().includes(query));

    return matchesSearch && filterFields.slice(1).every(({ key, type, control }) => {
        const value = String(row[key] ?? "");
        return !control.value || (type === "date" ? value.slice(0, 10) : value) === control.value;
    });
}

function renderModuleFilters(preserve = false) {
    const previousValues = preserve ? Object.fromEntries(filterFields.map(({ key, control }) => [key, control.value])) : {};
    const filters = moduleConfig.filters?.(moduleRole.value) ?? [];
    filterFields = [moduleSearchField, ...filters].map((field) => makeModuleField(field, "filter", previousValues[field.key], true));
    moduleFilters.replaceChildren(...filterFields.map(({ wrapper }) => wrapper));
}

function addCardAction(container, label, title, run, destructive = false) {
    const button = element("button", label, `module-button module-secondary${destructive ? " module-delete" : ""}`);
    button.type = "button";
    button.setAttribute("aria-label", `${label} ${title}`);
    button.addEventListener("click", run);
    container.append(button);
}

function buildModuleCard(row) {
    const title = moduleConfig.title(row);
    const card = element("li", "", "staff-card module-card");
    const main = element("div", "", "module-card-main");
    const meta = element("div", "", "module-card-meta");
    meta.append(element("span", `ID ${row.id}`, "module-tag"));
    if (moduleConfig.badge) {
        const status = moduleConfig.badge(row);
        const badge = element("span", status, "module-status-tag");
        badge.dataset.status = status;
        meta.append(badge);
    }

    const heading = element("h3", title);
    heading.id = `module-row-${row.id}`;
    heading.tabIndex = -1;
    main.append(meta, heading);
    if (moduleConfig.subtitle) main.append(element("p", moduleConfig.subtitle(row), "module-subtitle"));

    const details = element("dl", "", "module-details");
    for (const [label, value] of moduleConfig.details(row)) {
        const pair = document.createElement("div");
        pair.append(element("dt", label), element("dd", value || "Not listed"));
        details.append(pair);
    }

    main.append(details);
    card.append(main);
    const actions = element("div", "", "module-card-actions");
    if (moduleConfig.edit.includes(moduleRole.value)) addCardAction(actions, "Edit", title, () => openModuleEditor(row));
    if (moduleConfig.remove.includes(moduleRole.value)) addCardAction(actions, "Delete", title, () => openModuleDeletion(row), true);
    if (moduleConfig.accountActions) {
        addCardAction(actions, row.active ? "Deactivate" : "Activate", title, () => openAccountStatus(row));
        addCardAction(actions, "Preview password reset", title, () => openPasswordReset(row));
    }
    if (actions.childElementCount) card.append(actions);
    return card;
}

function renderModuleRows() {
    const visible = moduleRows.filter((row) => isVisibleToRole(row) && matchesModuleFilters(row));
    if (currentModule === "appointments") visible.sort((first, second) => first.dateTime.localeCompare(second.dateTime));
    moduleList.replaceChildren(...visible.map(buildModuleCard));
    moduleResults.dataset.empty = String(visible.length === 0);
    const label = visible.length === 1 ? moduleConfig.singular : moduleConfig.plural;
    moduleResults.textContent = visible.length ? `${visible.length} ${label} shown` : `No ${moduleConfig.plural} match this view.`;
    document.querySelector("#module-clear").disabled = !filterFields.some(({ control }) => control.value);
}

function displayModuleRole() {
    updateStaffNavigation(moduleRole.value, currentModule);
    const allowed = moduleConfig.view.includes(moduleRole.value);
    moduleDirectory.hidden = !allowed;
    document.querySelector("#module-unavailable").hidden = allowed;

    if (allowed) {
        moduleAdd.hidden = !moduleConfig.edit.includes(moduleRole.value);
        moduleFeedback.textContent = "";
        renderModuleFilters();
        renderModuleRows();
    }
}

function syncDoctorField() {
    const doctorField = editFields.find((field) => field.doctorOnly);
    if (doctorField) {
        const accountRole = editFields.find((field) => field.key === "role");
        const isDoctor = accountRole.control.value === "Doctor";
        doctorField.wrapper.hidden = !isDoctor;
        doctorField.control.disabled = !isDoctor;
    }
}

function openModuleEditor(row) {
    const blocked = !row && moduleConfig.unavailableAdd?.(moduleRole.value);
    if (blocked) {
        openModuleConfirmation("No eligible appointments", blocked);
        return;
    }

    editingRow = row;
    document.querySelector("#module-editor-title").textContent = row ? `Edit ${moduleConfig.singular}` : moduleConfig.add;
    moduleError.textContent = "";
    editFields = moduleConfig.fields(row, moduleRole.value).map((field) =>
        makeModuleField(field, "edit", row?.[field.key] ?? field.default ?? ""));
    moduleFields.replaceChildren(...editFields.map(({ wrapper }) => wrapper));
    syncDoctorField();
    moduleEditor.showModal();
    editFields.find(({ control }) => !control.disabled)?.control.focus();
}

function showModuleFeedback(message, row) {
    moduleFeedback.textContent = staffStorageAvailable ? message : `${message} This browser keeps changes on this page only.`;
    const destination = row ? document.getElementById(`module-row-${row.id}`) : filterFields[0].control;
    destination?.focus();
}

moduleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!moduleConfig.edit.includes(moduleRole.value)) return;

    const record = {};
    for (const { key, control, options, doctorOnly } of editFields) {
        if (doctorOnly && control.disabled) continue;
        const value = control.value.trim();
        if (control.required && !value) {
            moduleError.textContent = `Enter a value for ${control.labels[0].textContent.toLowerCase()}.`;
            control.focus();
            return;
        }
        record[key] = value && Array.isArray(options?.[0]) ? Number(value) : value;
    }

    const error = moduleConfig.validate?.(record, editingRow);
    if (error) {
        moduleError.textContent = error;
        return;
    }

    const row = editingRow ?? { id: staffData.nextIds[moduleConfig.collection]++ };
    Object.assign(row, record);
    if (moduleConfig.accountActions && row.role !== "Doctor") delete row.doctorId;
    if (!editingRow) {
        if (moduleConfig.accountActions) row.active = true;
        moduleRows.push(row);
    }

    saveStaffData();
    moduleEditor.close();
    renderModuleFilters(true);
    if (!matchesModuleFilters(row)) renderModuleFilters();
    renderModuleRows();
    showModuleFeedback(`${moduleConfig.title(row)} ${editingRow ? "updated" : "added"}.`, row);
});

function openModuleConfirmation(title, description, actionLabel, action) {
    document.querySelector("#module-confirmation-title").textContent = title;
    document.querySelector("#module-confirmation-description").textContent = description;
    moduleConfirm.textContent = actionLabel ?? "";
    moduleConfirm.hidden = !action;
    moduleCancel.textContent = action ? "Cancel" : "Close";
    confirmAction = action;
    moduleConfirmation.showModal();
}

function openModuleDeletion(row) {
    const reason = moduleConfig.deleteBlock?.(row);
    if (reason) {
        openModuleConfirmation(`Cannot delete ${moduleConfig.singular}`, reason);
        return;
    }

    const title = moduleConfig.title(row);
    openModuleConfirmation(`Delete ${moduleConfig.singular}`, `Delete ${title} from this preview?`, "Delete", () => {
        moduleRows.splice(moduleRows.indexOf(row), 1);
        saveStaffData();
        renderModuleFilters(true);
        renderModuleRows();
        showModuleFeedback(`${title} deleted.`);
    });
}

function openAccountStatus(row) {
    const action = row.active ? "Deactivate" : "Activate";
    openModuleConfirmation(`${action} account`, `${action} ${row.username} in this preview?`, action, () => {
        row.active = !row.active;
        saveStaffData();
        renderModuleRows();
        showModuleFeedback(`${row.username} is ${row.active ? "active" : "inactive"}.`, row);
    });
}

function openPasswordReset(row) {
    openModuleConfirmation("Preview password reset", `Preview the reset confirmation for ${row.username}. This demo uses no passwords.`,
        "Confirm preview", () => showModuleFeedback(`Password reset preview completed for ${row.username}.`, row));
}

moduleConfirm.addEventListener("click", () => {
    moduleConfirmation.close();
    confirmAction?.();
});
moduleCancel.addEventListener("click", () => moduleConfirmation.close());
document.querySelector("#module-cancel-edit").addEventListener("click", () => moduleEditor.close());
moduleFields.addEventListener("input", () => { moduleError.textContent = ""; });
moduleFields.addEventListener("change", syncDoctorField);
moduleFilters.addEventListener("input", () => {
    moduleFeedback.textContent = "";
    renderModuleRows();
});
document.querySelector("#module-clear").addEventListener("click", () => {
    for (const { control } of filterFields) control.value = "";
    moduleFeedback.textContent = "";
    renderModuleRows();
    filterFields[0].control.focus();
});
moduleAdd.textContent = moduleConfig.add;
moduleAdd.addEventListener("click", () => openModuleEditor());
moduleRole.value = getStaffPreviewRole();
moduleRole.addEventListener("change", displayModuleRole);
displayModuleRole();
document.querySelector("#module-role-field").hidden = false;
if (!staffStorageAvailable) {
    document.querySelector("#module-preview-note").textContent = "Use fictional information. This browser keeps sample edits on this page only.";
}

