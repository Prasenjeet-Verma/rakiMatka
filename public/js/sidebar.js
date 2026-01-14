const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");

menuBtn.addEventListener("click", (e) => {
  // Prevent the click from bubbling up if you add a close-on-click-outside listener later
  e.stopPropagation();

  // This toggles the 'transform' property
  // On mobile: -translate-x-full moves it left out of view
  // translate-x-0 brings it back into view
  sidebar.classList.toggle("-translate-x-full");
  sidebar.classList.toggle("translate-x-0");
});

// Optional: Close sidebar when clicking anywhere on the main content (Mobile only)
document.querySelector("main").addEventListener("click", () => {
  if (!sidebar.classList.contains("-translate-x-full")) {
    sidebar.classList.add("-translate-x-full");
    sidebar.classList.remove("translate-x-0");
  }
});
