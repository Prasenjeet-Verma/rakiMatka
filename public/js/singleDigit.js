document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("btnSingleDigit");
  const gameBox = document.getElementById("singleDigitGame");
  const closeBtn = document.getElementById("closeSingle");

  const grid = document.getElementById("singleDigitGrid");
  const totalDisplay = document.getElementById("singleDigitTotal");
  const submitBtn = document.getElementById("submitSingleDigit");
  const betTypeSelect = document.getElementById("betTypeSingle");

  let serverTime = null;
  let openTime = gameBox.dataset.openTime; // HH:mm
  let openLocked = false;

  // 🔥 current mode (default OPEN)
  let currentMode = "OPEN";

  /* ================= MESSAGE BOX ================= */
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
      padding: "12px 26px",
      borderRadius: "14px",
      color: "#fff",
      fontWeight: "700",
      fontSize: "14px",
      zIndex: "99999",
      boxShadow: "0 15px 30px rgba(0,0,0,.3)",
      background:
        type === "success"
          ? "linear-gradient(135deg,#16a34a,#22c55e)"
          : "linear-gradient(135deg,#dc2626,#ef4444)",
    });

    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3500);
  }

  /* ================= SERVER TIME ================= */
  async function syncServerTime() {
    try {
      const res = await fetch("/server-time");
      const data = await res.json();
      if (data.success) serverTime = data.time;
    } catch {}
  }

  function checkOpenLock() {
    if (!serverTime || !openTime || openLocked) return;

    if (serverTime >= openTime) {
      openLocked = true;
      betTypeSelect.value = "close";
      betTypeSelect.querySelector('option[value="open"]').disabled = true;
      currentMode = "CLOSE";
      showMessage("Open Time Bet Close ❌", "error");
    }
  }

  syncServerTime().then(checkOpenLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenLock();
  }, 5000);

  /* ================= OPEN / CLOSE ================= */
  openBtn?.addEventListener("click", () =>
    gameBox.classList.remove("hidden")
  );
  closeBtn?.addEventListener("click", () =>
    gameBox.classList.add("hidden")
  );

  /* ================= MODE CHANGE ================= */
  betTypeSelect.addEventListener("change", () => {
    currentMode = betTypeSelect.value.toUpperCase();
  });

  /* ================= GRID CREATE ================= */
  let html = "";
  for (let i = 0; i <= 9; i++) {
    html += `
      <div class="flex border-2 border-[#005c4b] rounded-lg overflow-hidden h-14">
        <div class="bg-[#005c4b] text-white w-1/3 flex items-center justify-center font-bold text-xl">
          ${i}
        </div>
        <input
          type="number"
          class="amount-input w-2/3 text-center font-semibold outline-none"
          data-number="${i}"
          data-mode="OPEN"
          placeholder="Amount"
        />
      </div>
    `;
  }
  grid.innerHTML = html;

  /* ================= INPUT HANDLER ================= */
  grid.addEventListener("input", (e) => {
    if (!e.target.classList.contains("amount-input")) return;

    // 🔒 lock mode at input time
    e.target.dataset.mode = currentMode;

    let total = 0;
    grid.querySelectorAll(".amount-input").forEach((i) => {
      total += parseInt(i.value) || 0;
    });
    totalDisplay.innerText = total;
  });

  /* ================= SUBMIT ================= */
  submitBtn.addEventListener("click", async () => {
    const bets = [];

    grid.querySelectorAll(".amount-input").forEach((input) => {
      const amount = parseInt(input.value);
      if (amount > 0) {
        bets.push({
          number: Number(input.dataset.number),
          amount,
          mode: input.dataset.mode, // 🔥 per-input mode
        });
      }
    });

    if (bets.length === 0) {
      showMessage("Please enter at least one bet ❌", "error");
      return;
    }

    try {
      const res = await fetch("/single-digit/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameBox.dataset.gameId,
          gameName: gameBox.dataset.gameName,
          bets,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showMessage(data.message || "Bet placed ✅");
      } else {
        showMessage(data.message || "Bet failed ❌", "error");
      }
    } catch {
      showMessage("Server error ❌", "error");
    }
  });
});
