// --- Tab Switching Logic ---
const tabUsername = document.getElementById("tab-username");
const tabPhone = document.getElementById("tab-phone");

const inputUsername = document.getElementById("input-group-username");
const inputPhone = document.getElementById("input-group-phone");

const usernameInput = document.getElementById("username");
const phoneInput = document.getElementById("phone");

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

// --- Password Visibility Logic ---
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", () => {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
  togglePassword.classList.toggle("fa-eye");
  togglePassword.classList.toggle("fa-eye-slash");
});

// --- No client-side fake submit ---
// The form now submits normally to /login where server checks:
// $or: [{ username: login }, { phoneNo: login }]
