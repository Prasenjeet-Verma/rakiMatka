// dateTime.js

// Selected game and day for editing
let selectedGameId = null;
let selectedDay = null;

// ====================== ADD MODAL ======================
function openModal() {
  const modal = document.getElementById("addModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal() {
  const modal = document.getElementById("addModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// ====================== EDIT MODAL ======================
function openEditModal(gameId, day) {
  const form = document.getElementById("editForm");

  if(day === 'all') {
    form.action = `/admin/game/update-all/${gameId}`;
  } else {
    form.action = `/admin/game/update-day/${gameId}?day=${day}`; // or hidden input
    // Better: use hidden input for day
    let dayInput = form.querySelector('input[name="day"]');
    if(!dayInput) {
      dayInput = document.createElement('input');
      dayInput.type = 'hidden';
      dayInput.name = 'day';
      form.appendChild(dayInput);
    }
    dayInput.value = day;
  }

  document.getElementById("editModal").classList.remove("hidden");
}


function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");

  // Reset selected values (optional)
  selectedGameId = null;
  selectedDay = null;
}

// ====================== EXPORT (optional, if using module) ======================
// export { openModal, closeModal, openEditModal, closeEditModal };
