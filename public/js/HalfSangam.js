document.addEventListener("DOMContentLoaded", () => {
  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("halfSugam");

  const openDigitInput = document.getElementById("openDigit");
  const closePannaInput = document.getElementById("closePanna");
  const pointsInput = document.getElementById("points");

  const addBtn = document.getElementById("addBid");
  const submitBtn = document.getElementById("HalfSangamSubmit");
  const betTable = document.getElementById("halfsangambetTable");

  const bidsDisplay = {
    totalBids: document.getElementById("halfSangamBids"),
    totalAmount: document.getElementById("halfSangamAmount"),
  };

  /* ================= STORE ================= */
  let bidRegistry = [];
  let serverTime = null;
  let gameClosed = false;

  /* ================= TOAST ================= */
  function showMessage(msg, type = "success") {
    const box = document.createElement("div");
    box.innerText = msg;

    box.style.cssText = `
      position:fixed;
      top:20px;
      left:50%;
      transform:translateX(-50%);
      padding:12px 26px;
      border-radius:14px;
      background:${type === "success" ? "#16a34a" : "#dc2626"};
      color:#fff;
      font-weight:700;
      z-index:9999;
      box-shadow:0 10px 25px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
  }

  /* ================= SERVER TIME ================= */
  async function syncServerTime() {
    try {
      const res = await fetch("/server-time");
      const data = await res.json();
      if (data.success) serverTime = data.time;
    } catch {
      console.error("Server time fetch failed");
    }
  }

  function checkGameClosed() {
    const openTime = gameBox.dataset.openTime;
    if (!serverTime || !openTime || gameClosed) return;

    if (serverTime >= openTime) {
      gameClosed = true;
      showMessage("Game Closed ❌", "error");

      addBtn.disabled = true;
      submitBtn.disabled = true;
      addBtn.classList.add("opacity-50");
      submitBtn.classList.add("opacity-50");
    }
  }

  syncServerTime().then(checkGameClosed);
  setInterval(async () => {
    await syncServerTime();
    checkGameClosed();
  }, 5000);

  /* ================= HELPERS ================= */
  function refreshBottom() {
    bidsDisplay.totalBids.innerText = bidRegistry.length;
    bidsDisplay.totalAmount.innerText = bidRegistry.reduce(
      (s, b) => s + b.totalAmount,
      0
    );
  }

  function renderTable() {
    betTable.innerHTML = "";
    bidRegistry.forEach((b, i) => {
      betTable.innerHTML += `
        <tr>
          <td>${b.openPanna}</td>
          <td>${b.closeDigit}</td>
          <td>${b.totalAmount}</td>
          <td>
            <i data-index="${i}"
              class="fa-solid fa-trash text-red-600 cursor-pointer deleteBid"></i>
          </td>
        </tr>
      `;
    });
    refreshBottom();
  }

  /* ================= INPUT RULES ================= */

  // OPEN PANNA → exactly 3 digits
  openDigitInput.addEventListener("input", () => {
    openDigitInput.value = openDigitInput.value.replace(/[^0-9]/g, "");
    if (openDigitInput.value.length > 3) {
      openDigitInput.value = openDigitInput.value.slice(0, 3);
    }
  });

  // CLOSE DIGIT → single digit
  closePannaInput.removeAttribute("readonly");
  closePannaInput.addEventListener("input", () => {
    closePannaInput.value = closePannaInput.value.replace(/[^0-9]/g, "");
    if (closePannaInput.value.length > 1) {
      closePannaInput.value = closePannaInput.value.slice(0, 1);
    }
  });

  /* ================= ADD BID ================= */
  addBtn.onclick = () => {
    if (gameClosed) {
      return showMessage("Game Closed ❌", "error");
    }

    const openPanna = openDigitInput.value;
    const closeDigit = closePannaInput.value;
    const points = Number(pointsInput.value);

    if (!/^\d{3}$/.test(openPanna)) {
      return showMessage("Open Panna must be 3 digits ❌", "error");
    }

    if (!/^\d{1}$/.test(closeDigit)) {
      return showMessage("Close Digit must be single digit ❌", "error");
    }

    if (!points || points <= 0) {
      return showMessage("Invalid points ❌", "error");
    }

    const existing = bidRegistry.find(
      b =>
        b.openPanna === Number(openPanna) &&
        b.closeDigit === Number(closeDigit)
    );

    if (existing) {
      existing.totalAmount += points;
    } else {
      bidRegistry.push({
        openPanna: Number(openPanna),
        closeDigit: Number(closeDigit),
        totalAmount: points,
      });
    }

    openDigitInput.value = "";
    closePannaInput.value = "";
    pointsInput.value = "";

    renderTable();
  };

  /* ================= DELETE ================= */
  betTable.onclick = (e) => {
    if (e.target.classList.contains("deleteBid")) {
      bidRegistry.splice(e.target.dataset.index, 1);
      renderTable();
    }
  };

  /* ================= SUBMIT ================= */
  submitBtn.onclick = async () => {
    if (gameClosed) {
      return showMessage("Game Closed ❌", "error");
    }

    if (!bidRegistry.length) {
      return showMessage("Add at least one bid ❌", "error");
    }

    try {
      const res = await fetch("/half-sangam/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameBox.dataset.gameId,
          gameName: gameBox.dataset.gameName,
          bets: bidRegistry,
        }),
      });

      const data = await res.json();
      showMessage(data.message, data.success ? "success" : "error");

      if (data.success) {
        bidRegistry = [];
        renderTable();
      }
    } catch {
      showMessage("Server error ❌", "error");
    }
  };
});