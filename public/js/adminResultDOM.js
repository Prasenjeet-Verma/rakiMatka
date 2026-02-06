document.addEventListener("DOMContentLoaded", function () {
  console.log("JS Loaded: adminResultDOM.js is running.");

  // --- Select Elements ---
  const showBtn = document.getElementById("showResultBtn");
  const closeBtn = document.getElementById("closeResultBtn");
  const container = document.getElementById("resultContainer");

  // --- Debugging Checks ---
  if (!showBtn)
    console.error("ERROR: Could not find element with id='showResultBtn'");
  if (!closeBtn)
    console.error("ERROR: Could not find element with id='closeResultBtn'");
  if (!container)
    console.error("ERROR: Could not find element with id='resultContainer'");

  // --- Add Event Listeners if elements exist ---
  if (showBtn && container) {
    showBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Clicked Show Result");
      container.classList.remove("hidden");
    });
  }

  if (closeBtn && container) {
    closeBtn.addEventListener("click", function () {
      console.log("Clicked Close Button");
      container.classList.add("hidden");
    });
  }

  // --- Sidebar Logic (Mobile) ---
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (sidebar.classList.contains("-translate-x-full")) {
        sidebar.classList.remove("-translate-x-full");
      } else {
        sidebar.classList.add("-translate-x-full");
      }
    });
  }
});
