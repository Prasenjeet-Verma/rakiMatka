// const modal = document.getElementById("pointsModal");
// const modalTitle = document.getElementById("modalTitle");
// const pointsTypeInput = document.getElementById("pointsType");

// document.querySelectorAll(".openPointsModal").forEach((btn) => {
//   btn.addEventListener("click", () => {
//     const type = btn.dataset.type;

//     modal.classList.remove("hidden");

//     if (type === "add") {
//       modalTitle.textContent = "Add Points";
//       pointsTypeInput.value = "Credit";
//     } else {
//       modalTitle.textContent = "Withdraw Points";
//       pointsTypeInput.value = "Debit";
//     }
//   });
// });

// document.getElementById("closePointsModal").onclick = document.getElementById(
//   "cancelPointsModal"
// ).onclick = () => {
//   modal.classList.add("hidden");
// };

// modal.addEventListener("click", (e) => {
//   if (e.target === modal) modal.classList.add("hidden");
// });


const modal = document.getElementById("pointsModal");
const closeBtn = document.getElementById("closePointsModal");
const cancelBtn = document.getElementById("cancelPointsModal");
const submitBtn = document.getElementById("submitPoints");

const pointsTypeInput = document.getElementById("pointsType");
const pointsAmount = document.getElementById("pointsAmount");

let selectedUserId = null;
let selectedAction = null;

// Create success/error box
const msgBox = document.createElement("div");
msgBox.className = "hidden text-sm mt-2 text-center";
modal.querySelector(".p-5").appendChild(msgBox);

// Open modal
document.querySelectorAll(".openPointsModal").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedUserId = btn.dataset.userid;
    const type = btn.dataset.type;

    modal.classList.remove("hidden");
    msgBox.classList.add("hidden");
    pointsAmount.value = "";

    if (type === "add") {
      document.getElementById("modalTitle").innerText = "Add Points";
      pointsTypeInput.value = "credit";
      selectedAction = "admin_credit";
    } else {
      document.getElementById("modalTitle").innerText = "Withdraw Points";
      pointsTypeInput.value = "debit";
      selectedAction = "admin_debit";
    }
  });
});


submitBtn.addEventListener("click", async () => {
  const amount = Number(pointsAmount.value);

  if (!amount || amount <= 0) {
    msgBox.className = "text-red-600 text-sm mt-2 text-center";
    msgBox.innerText = "Enter valid amount";
    msgBox.classList.remove("hidden");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Processing...";

  try {
    const res = await fetch("/admin/update-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        amount,
        type: pointsTypeInput.value,   // credit | debit
        action: selectedAction         // admin_credit | admin_debit
      })
    });

    const data = await res.json();

    if (data.success) {
      msgBox.className = "text-green-600 text-sm mt-2 text-center";
      msgBox.innerText = "Wallet updated successfully!";
      msgBox.classList.remove("hidden");

      setTimeout(() => {
        location.reload();
      }, 500);
    } else {
      msgBox.className = "text-red-600 text-sm mt-2 text-center";
      msgBox.innerText = data.message || "Update failed";
      msgBox.classList.remove("hidden");
    }
  } catch (err) {
    msgBox.className = "text-red-600 text-sm mt-2 text-center";
    msgBox.innerText = "Server error. Try again.";
    msgBox.classList.remove("hidden");
  }

  submitBtn.disabled = false;
  submitBtn.innerText = "Submit";
});

closeBtn.onclick = cancelBtn.onclick = () => {
  modal.classList.add("hidden");
};

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});
