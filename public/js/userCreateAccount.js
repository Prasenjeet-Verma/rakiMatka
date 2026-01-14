// --- Password Visibility Logic ---
const togglePassword = document.querySelector("#togglePassword");
const toggleConfirmPassword = document.querySelector("#toggleConfirmPassword");
const passwordInput = document.querySelector("#password");
const confirmPasswordInput = document.querySelector("#confirmPassword");

function handlePasswordToggle() {
  // Toggle type between password and text
  const newType = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = newType;
  confirmPasswordInput.type = newType;

  // Toggle icon classes
  const isShowingText = newType === "text";

  togglePassword.classList.toggle("fa-eye", !isShowingText);
  togglePassword.classList.toggle("fa-eye-slash", isShowingText);

  toggleConfirmPassword.classList.toggle("fa-eye", !isShowingText);
  toggleConfirmPassword.classList.toggle("fa-eye-slash", isShowingText);
}

// Attach event listeners
togglePassword.addEventListener("click", handlePasswordToggle);
toggleConfirmPassword.addEventListener("click", handlePasswordToggle);

// --- OPTIONAL: Client-side check for matching passwords before submit ---
const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", function (e) {
  // Prevent submission only if passwords don't match
  if (passwordInput.value !== confirmPasswordInput.value) {
    e.preventDefault(); // stop form from submitting
    confirmPasswordInput.focus();
    // Optional: Show inline error instead of alert
    let errorDiv = document.querySelector(".error-messages");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.className = "error-messages";
      registerForm.parentNode.insertBefore(errorDiv, registerForm);
    }
    errorDiv.innerHTML = "<p class='error'>Passwords do not match!</p>";
  }
  // Otherwise, the form submits normally to /signup
});
