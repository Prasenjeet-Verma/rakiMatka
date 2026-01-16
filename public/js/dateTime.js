// <!-- Date & Time -->

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

function openEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}
