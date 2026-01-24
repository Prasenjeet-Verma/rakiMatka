document.addEventListener("DOMContentLoaded", () => {
  /* ================= ELEMENTS ================= */
  const openBtn = document.getElementById("btnTriplePanna");
  const closeBtn = document.getElementById("closeTriplePanna");
  const gameBox = document.getElementById("triplePanna");
  const grid = document.getElementById("tp-main-grid");
  const totalDisplay = document.getElementById("tp-final-total");
  const betTypeSelect = document.getElementById("tp-select-trigger");

  /* ================= VARIABLES ================= */
  const tpNumbers = ["000","111","222","333","444","555","666","777","888","999"];
  let serverTime = null;
  let openTime = gameBox?.dataset.openTime; // "HH:mm"
  let openLocked = false;
  let currentMode = "OPEN";

  /* ================= MESSAGE ================= */
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
      background: type === "success"
        ? "linear-gradient(135deg,#16a34a,#22c55e)"
        : "linear-gradient(135deg,#dc2626,#ef4444)",
    });

    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
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
      currentMode = "CLOSE";

      if (betTypeSelect) {
        betTypeSelect.innerText = "CLOSE";
        betTypeSelect.disabled = true;
        betTypeSelect.classList.add("opacity-50", "cursor-not-allowed");
      }

      const menu = document.getElementById("tp-dropdown-box");
      if (menu) menu.classList.add("tp-hidden");

      showMessage("Open Time Bet Closed ❌", "error");
    }
  }

  syncServerTime().then(checkOpenLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenLock();
  }, 5000);

  /* ================= OPEN / CLOSE MODAL ================= */
  openBtn?.addEventListener("click", () => gameBox?.classList.remove("hidden"));
 closeBtn?.addEventListener("click", () => {
  // Reset all input fields inside the grid
  grid.querySelectorAll(".tp-amount-input").forEach(input => {
    input.value = "";
    input.dataset.mode = "OPEN"; // optional: reset mode
  });

  // Reset total display
  if (totalDisplay) totalDisplay.value = "0";
});


  /* ================= DROPDOWN ================= */
  window.tpToggleMenu = () => {
    if (openLocked) return;
    const menu = document.getElementById("tp-dropdown-box");
    if (menu) menu.classList.toggle("tp-hidden");
  };

  window.tpSetGameType = (val) => {
    if (openLocked && val === "OPEN") {
      showMessage("Open Time Bet Closed ❌", "error");
      return;
    }
    currentMode = val;
    if (betTypeSelect) betTypeSelect.innerText = val;

    const menu = document.getElementById("tp-dropdown-box");
    if (menu) menu.classList.add("tp-hidden");
  };

  /* ================= GRID ================= */
  if (grid) {
    tpNumbers.forEach((num) => {
      const div = document.createElement("div");
      div.className =
        "flex border-2 border-[#005c4b] rounded overflow-hidden bg-white";
      div.innerHTML = `
        <div class="bg-[#005c4b] text-white w-14 flex items-center justify-center font-bold">
          ${num}
        </div>
        <input type="number" placeholder="0"
          class="tp-amount-input w-full p-2 outline-none font-semibold"
          data-number="${num}" data-mode="OPEN">
      `;
      grid.appendChild(div);
    });
  }

  /* ================= INPUT ================= */
  grid?.addEventListener("input", (e) => {
    if (!e.target.classList.contains("tp-amount-input")) return;
    e.target.dataset.mode = currentMode;

    let sum = 0;
    grid.querySelectorAll(".tp-amount-input").forEach((i) => {
      const v = parseFloat(i.value);
      if (!isNaN(v)) sum += v;
    });
    if (totalDisplay) totalDisplay.value = sum;
  });

  /* ================= SUBMIT ================= */
  window.tpSubmitFinalData = async () => {
    const bets = [];
    grid.querySelectorAll(".tp-amount-input").forEach((input) => {
      const amount = parseFloat(input.value);
      if (amount > 0) {
        bets.push({
          number: input.dataset.number,
          amount,
          mode: input.dataset.mode,
        });
      }
    });

    if (bets.length === 0) {
      showMessage("Enter at least one bet ❌", "error");
      return;
    }

    try {
      const res = await fetch("/triple-panna/place-bet", {
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
        showMessage("Bet placed ✅");
        grid.querySelectorAll(".tp-amount-input").forEach(i => i.value = "");
        if (totalDisplay) totalDisplay.value = "0";
      } else {
        showMessage(data.message || "Bet failed ❌", "error");
      }
    } catch {
      showMessage("Server error ❌", "error");
    }
  };
});
