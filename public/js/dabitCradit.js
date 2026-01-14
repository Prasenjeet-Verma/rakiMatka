const modal = document.getElementById("walletModal");
const closeBtn = document.getElementById("closeWalletModal");
const cancelBtn = document.getElementById("cancelWalletModal");

// Open modal from ANY edit button
document.querySelectorAll(".openWalletModal").forEach((button) => {
  button.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });
});

// Close modal
closeBtn.onclick = cancelBtn.onclick = () => {
  modal.classList.add("hidden");
};

// Click outside modal to close
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});
