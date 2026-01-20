// jackpotDateTime.js

// ====================== ADD MODAL ======================
function openModal() {
  const modal = document.getElementById("addModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal() {
  const modal = document.getElementById("addModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// ====================== EDIT MODAL ======================
function openEditModal(gameId, day, type = "jackpot") {
  const form = document.getElementById("editForm");
  if (!form) return;

  // ✅ Edit ALL days
  if (day === "all") {
    form.action = `/admin/game/update-all/${gameId}/${type}`;
  }
  // ✅ Edit single day
  else {
    form.action = `/admin/game/update-day/${gameId}/${type}`;

    let dayInput = form.querySelector('input[name="day"]');
    if (!dayInput) {
      dayInput = document.createElement("input");
      dayInput.type = "hidden";
      dayInput.name = "day";
      form.appendChild(dayInput);
    }
    dayInput.value = day;
  }

  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}
