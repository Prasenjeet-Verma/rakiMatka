const modal = document.getElementById("pointsModal");
const modalTitle = document.getElementById("modalTitle");
const pointsTypeInput = document.getElementById("pointsType");

document.querySelectorAll(".openPointsModal").forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.type;

    modal.classList.remove("hidden");

    if (type === "add") {
      modalTitle.textContent = "Add Points";
      pointsTypeInput.value = "Credit";
    } else {
      modalTitle.textContent = "Withdraw Points";
      pointsTypeInput.value = "Debit";
    }
  });
});

document.getElementById("closePointsModal").onclick = document.getElementById(
  "cancelPointsModal"
).onclick = () => {
  modal.classList.add("hidden");
};

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});
