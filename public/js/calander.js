const datePicker = document.getElementById("datePicker");
const filterBtn = document.getElementById("filterBtn");

// 1. Function to handle the filtering
filterBtn.addEventListener("click", () => {
  const selectedDate = datePicker.value;
  if (selectedDate) {
    alert("Filtering data for: " + selectedDate);
    // Here you would typically make an API call or filter a list
  } else {
    alert("Please select a date first.");
  }
});

// 2. Optional: Set default date to today's date automatically
// (Your screenshot shows 09-01-2026)
window.onload = () => {
  // If you want it to always show the current date on load:
  // const today = new Date().toISOString().split('T')[0];
  // datePicker.value = today;
};
