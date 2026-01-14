const openModal = document.getElementById("openModal");
const closeModal = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");
const userModal = document.getElementById("userModal");

openModal.onclick = () => {
  userModal.classList.remove("hidden");
};

closeModal.onclick = () => {
  userModal.classList.add("hidden");
};

cancelModal.onclick = () => {
  userModal.classList.add("hidden");
};

// Close modal when clicking outside
userModal.onclick = (e) => {
  if (e.target === userModal) {
    userModal.classList.add("hidden");
  }
};
