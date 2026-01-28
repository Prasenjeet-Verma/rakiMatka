document.addEventListener("DOMContentLoaded", () => {
  const gameBox = document.getElementById("centerGameBulk");
  const closeBtn = document.getElementById("closeCenterGameBulk");
  const openInput = gameBox.querySelector('input[placeholder="Enter Center"]');
  const pointsInput = gameBox.querySelector('input[placeholder="Enter Point"]');
  const bidsDisplay = document.getElementById("centerGameBidsCount");
  const amountDisplay = document.getElementById("centerGameAmountTotal");
  const addBtn = document.getElementById("addCenterGameBetBtn");
  const liveBetsContainer = document.getElementById("centerGameLiveBetsContainer");
  const submitBtn = document.getElementById("submitCenterGameBetBtn");
  const openBtn = document.getElementById("btnCenterGame");

  let bets = [];

  // ================= OPEN =================
  openBtn.addEventListener("click", () => {
    gameBox.classList.remove("hidden");
  });

  // ================= CLOSE =================
  closeBtn.addEventListener("click", () => {
    gameBox.classList.add("hidden");
  });

  // ================= MESSAGE BOX =================
  function showMessage(message, type = "success") {
    const old = document.getElementById("jsMsgBox");
    if (old) old.remove();

    const box = document.createElement("div");
    box.id = "jsMsgBox";
    box.innerText = message;

    Object.assign(box.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "12px 24px",
      borderRadius: "12px",
      color: "#fff",
      fontWeight: "600",
      zIndex: "9999",
      boxShadow: "0 10px 25px rgba(0,0,0,.25)",
      background: type === "success" ? "#16a34a" : "#dc2626",
    });

    document.body.appendChild(box);
    setTimeout(() => { box.style.opacity = 0; box.style.top = "0px"; }, 4500);
    setTimeout(() => box.remove(), 5000);
  }

  // ================= LIVE UPDATE =================
  function updateLivePreview() {
    bidsDisplay.innerText = openInput.value || "0";
    amountDisplay.innerText = pointsInput.value || "0";
  }

  openInput.addEventListener("input", updateLivePreview);
  pointsInput.addEventListener("input", updateLivePreview);

  // ================= ADD BET =================
  addBtn.addEventListener("click", () => {
    const centerDigit = openInput.value.trim();
    const points = Number(pointsInput.value);

    if (!centerDigit) return showMessage("Enter valid center game ❌", "error");
    if (isNaN(points) || points <= 0) return showMessage("Enter valid points ❌", "error");

    bets.push({ openDigit: centerDigit, amount: points });

    const betDiv = document.createElement("div");
    betDiv.classList.add("flex","justify-between","items-center","bg-gray-100","p-3","rounded-lg");
    betDiv.innerHTML = `
      <span class="font-semibold">#${bets.length} - ${centerDigit}</span>
      <span class="font-semibold">₹${points}</span>
    `;
    liveBetsContainer.appendChild(betDiv);

    openInput.value = "";
    pointsInput.value = "";
    bidsDisplay.innerText = "0";
    amountDisplay.innerText = "0";

    showMessage(`Added ${centerDigit} - ₹${points} ✅`);
  });

  // ================= SUBMIT BET =================
  submitBtn.addEventListener("click", async () => {
    if (bets.length === 0) return showMessage("Add at least one bet ❌", "error");

    const payload = {
      gameId: gameBox.dataset.gameId,
      gameName: gameBox.dataset.gameName,
      bets
    };

    try {
      const res = await fetch("/center-game/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        showMessage(data.message || "Bet placed ✅");
        bets = [];
        bidsDisplay.innerText = "0";
        amountDisplay.innerText = "0";
        liveBetsContainer.innerHTML = "";
      } else {
        showMessage(data.message || "Bet failed ❌", "error");
      }
    } catch {
      showMessage("Server error ❌", "error");
    }
  });
});
