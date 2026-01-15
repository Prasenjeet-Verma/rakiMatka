const modal = document.getElementById("walletModal");
const closeBtn = document.getElementById("closeWalletModal");
const cancelBtn = document.getElementById("cancelWalletModal");
const submitBtn = document.getElementById("submitWallet");

// Success message box (dynamic)
const successBox = document.createElement("div");
successBox.className = "hidden text-green-600 text-sm mt-2 text-center";
successBox.innerText = "Wallet updated successfully!";
modal.querySelector(".p-5").appendChild(successBox);

// Open modal
let selectedUserId = null;

document.querySelectorAll(".openWalletModal").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedUserId = btn.dataset.userid;
    modal.classList.remove("hidden");
    successBox.classList.add("hidden");
  });
});

// Submit wallet update
submitBtn.addEventListener("click", async () => {
  const amount = modal.querySelector("input").value;
  const type = modal.querySelector("select").value; // credit | debit

  if (!amount || amount <= 0) {
    successBox.className = "text-red-600 text-sm mt-2 text-center";
    successBox.innerText = "Enter valid amount";
    successBox.classList.remove("hidden");
    return;
  }

  // 🔥 THIS WAS MISSING
  // Convert type into backend action
  let action;
  if (type === "credit") action = "admin_credit";
  else action = "admin_debit";

  submitBtn.disabled = true;
  submitBtn.innerText = "Processing...";

  try {
    const res = await fetch("/admin/update-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        amount,
        type,
        action   // 👈 VERY IMPORTANT
      })
    });

    const data = await res.json();

    if (data.success) {
      successBox.className = "text-green-600 text-sm mt-2 text-center";
      successBox.innerText = "Wallet updated successfully!";
      successBox.classList.remove("hidden");

      setTimeout(() => {
        location.reload();
      }, 500);
    } else {
      successBox.className = "text-red-600 text-sm mt-2 text-center";
      successBox.innerText = data.message || "Update failed";
      successBox.classList.remove("hidden");
    }

  } catch (err) {
    successBox.className = "text-red-600 text-sm mt-2 text-center";
    successBox.innerText = "Update failed. Try again.";
    successBox.classList.remove("hidden");
  }

  submitBtn.disabled = false;
  submitBtn.innerText = "Submit";
});

// Close modal
closeBtn.onclick = cancelBtn.onclick = () => {
  modal.classList.add("hidden");
};

// Click outside to close
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});
