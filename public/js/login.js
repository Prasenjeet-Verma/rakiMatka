// ================= PASSWORD EYE TOGGLE =================
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;

    togglePassword.classList.toggle("fa-eye");
    togglePassword.classList.toggle("fa-eye-slash");
  });
}

// ================= TAB LOGIC (SAFE MODE) =================
// Only runs if elements exist (so no crash)
const tabUsername = document.getElementById("tab-username");
const tabPhone = document.getElementById("tab-phone");

const inputUsername = document.getElementById("input-group-username");
const inputPhone = document.getElementById("input-group-phone");

const usernameInput = document.getElementById("username");
const phoneInput = document.getElementById("phone");

if (tabUsername && tabPhone && inputUsername && inputPhone && usernameInput && phoneInput) {
  tabUsername.addEventListener("click", () => {
    tabUsername.classList.add("active");
    tabPhone.classList.remove("active");

    inputUsername.classList.remove("hidden");
    inputPhone.classList.add("hidden");

    usernameInput.required = true;
    phoneInput.required = false;
    phoneInput.value = "";
  });

  tabPhone.addEventListener("click", () => {
    tabPhone.classList.add("active");
    tabUsername.classList.remove("active");

    inputPhone.classList.remove("hidden");
    inputUsername.classList.add("hidden");

    phoneInput.required = true;
    usernameInput.required = false;
    usernameInput.value = "";
  });
}
