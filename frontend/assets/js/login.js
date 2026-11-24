const form = document.querySelector("#login-form");
const fields = document.querySelector("#login-fields");
const usernameInput = document.querySelector("#login-username");
const passwordInput = document.querySelector("#login-password");
const passwordToggle = document.querySelector("#login-password-toggle");
const usernameError = document.querySelector("#username-error");
const passwordError = document.querySelector("#password-error");
const status = document.querySelector("#login-status");
const retryButton = document.querySelector("#retry-button");
const submitButton = document.querySelector("#login-submit");
const localLoginLink = document.querySelector("#local-login-link");
let csrfToken = "";

function setPasswordVisible(visible) {
    passwordInput.type = visible ? "text" : "password";
    passwordToggle.setAttribute("aria-pressed", String(visible));
}

passwordToggle.addEventListener("click", () => setPasswordVisible(passwordInput.type === "password"));
passwordToggle.hidden = false;

async function authRequest(endpoint, body) {
    const response = await fetch(`../backend/api/auth/${endpoint}.php`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        headers: body === undefined ? {} : {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const type = response.headers.get("Content-Type") || "";
    if (!type.includes("application/json")) {
        throw new Error("Sign-in needs the PHP server. Open this page through your local PHP server or the hosted website.");
    }
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Unable to complete the request.");
    }
    return result;
}

async function loadSession() {
    submitButton.disabled = true;
    csrfToken = "";
    retryButton.hidden = true;
    status.textContent = "Connecting…";
    try {
        const result = await authRequest("session");
        csrfToken = result.csrfToken;
        if (result.user) {
            location.replace("dashboard.php");
            return;
        }
        submitButton.disabled = false;
        status.textContent = "";
    } catch (error) {
        status.textContent = error instanceof TypeError
            ? "Could not reach the login server. Check that PHP is running and retry."
            : error.message;
        retryButton.hidden = false;
    }
}

function showFieldError(input, error, message) {
    error.textContent = message;

    if (message) {
        input.setAttribute("aria-invalid", "true");
    } else {
        input.removeAttribute("aria-invalid");
    }
}

function hasUsername() {
    return usernameInput.value.trim().length > 0;
}

usernameInput.addEventListener("input", () => {
    if (csrfToken) status.textContent = "";

    if (hasUsername()) {
        showFieldError(usernameInput, usernameError, "");
    }
});

passwordInput.addEventListener("input", () => {
    if (csrfToken) status.textContent = "";

    if (passwordInput.value.length > 0) {
        showFieldError(passwordInput, passwordError, "");
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;

    const usernameMissing = !hasUsername();
    const passwordMissing = passwordInput.value.length === 0;

    showFieldError(usernameInput, usernameError, usernameMissing ? "Enter a username." : "");
    showFieldError(passwordInput, passwordError, passwordMissing ? "Enter a password." : "");

    if (usernameMissing || passwordMissing) {
        status.textContent = "Check the indicated fields.";
        const firstInvalidInput = usernameMissing ? usernameInput : passwordInput;
        firstInvalidInput.focus();
        return;
    }

    fields.disabled = true;
    status.textContent = "Signing in…";
    try {
        const result = await authRequest("login", {
            username: usernameInput.value.trim(), password: passwordInput.value
        });
        csrfToken = result.csrfToken;
        form.reset();
        setPasswordVisible(false);
        submitButton.disabled = true;
        status.textContent = "Opening your dashboard…";
        location.replace("dashboard.php");
    } catch (error) {
        status.textContent = error.message || "Unable to connect. Please try again.";
        passwordInput.value = "";
        setPasswordVisible(false);
    } finally {
        fields.disabled = false;
    }
});

retryButton.addEventListener("click", loadSession);
fields.disabled = false;
if (location.protocol === "file:") {
    status.textContent = "Sign-in needs the PHP server. Open the local staff login below.";
    localLoginLink.hidden = false;
} else {
    loadSession();
}
