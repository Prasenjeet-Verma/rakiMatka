const modal = document.getElementById("walletModal");
const closeBtn = document.getElementById("closeWalletModal");
const cancelBtn = document.getElementById("cancelWalletModal");

// Open modal from ANY edit button
let selectedUserId = null;

document.querySelectorAll(".openWalletModal").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedUserId = btn.dataset.userid;
    document.getElementById("walletModal").classList.remove("hidden");
  });
});

document.getElementById("submitWallet").addEventListener("click", async () => {
  const amount = document.querySelector("#walletModal input").value;
  const type = document.querySelector("#walletModal select").value;

  const res = await fetch("/admin/update-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: selectedUserId, amount, type })
  });

  const data = await res.json();

  if (data.success) {
    alert("Wallet Updated");
    location.reload();
  }
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
