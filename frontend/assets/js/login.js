const form = document.querySelector("#login-form");
const fields = document.querySelector("#login-fields");
const usernameInput = document.querySelector("#login-username");
const passwordInput = document.querySelector("#login-password");
const passwordToggle = document.querySelector("#password-toggle");
const usernameError = document.querySelector("#username-error");
const passwordError = document.querySelector("#password-error");
const status = document.querySelector("#login-status");

function setPasswordVisibility(isVisible) {
    passwordInput.type = isVisible ? "text" : "password";
    passwordToggle.textContent = isVisible ? "Hide password" : "Show password";
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

passwordToggle.addEventListener("click", () => {
    setPasswordVisibility(passwordInput.type === "password");
});

usernameInput.addEventListener("input", () => {
    status.textContent = "";

    if (hasUsername()) {
        showFieldError(usernameInput, usernameError, "");
    }
});

passwordInput.addEventListener("input", () => {
    status.textContent = "";

    if (passwordInput.value.length > 0) {
        showFieldError(passwordInput, passwordError, "");
    }
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

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

    form.reset();
    setPasswordVisibility(false);
    status.textContent = "Sample input passed validation. Staff sign-in is unavailable in this preview.";
});

// Enable the preview after every event handler is ready.
fields.disabled = false;
