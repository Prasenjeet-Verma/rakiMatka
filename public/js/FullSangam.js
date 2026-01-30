document.addEventListener("DOMContentLoaded", () => {

  /* ================= ELEMENTS (EJS MATCH) ================= */
  const gameBox = document.getElementById("fullSugam");

  const openPannaInput  = document.getElementById("openPannaFullSanagam");
  const closePannaInput = document.getElementById("closePannaFullSangam");
  const pointsInput     = document.getElementById("fullsangampoints");

  const addBtn    = document.getElementById("fullsangamaddBid");
  const submitBtn = document.getElementById("fullSangamSubmit");

  const betTable = document.getElementById("fullsangambetTable");

  const bidsDisplay = {
    totalBids: document.getElementById("fullSangamBids"),
    totalAmount: document.getElementById("fullSangamAmount"),
  };

  /* ================= STORE ================= */
  let bidRegistry = [];
  let gameClosed = false;
  let serverTime = null;

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
      console.error("Time fetch failed");
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
    bidsDisplay.totalAmount.innerText =
      bidRegistry.reduce((s, b) => s + b.points, 0);
  }

  function renderTable() {
    betTable.innerHTML = "";
    bidRegistry.forEach((b, i) => {
      betTable.innerHTML += `
        <tr>
          <td>${b.openPanna}</td>
          <td>${b.closePanna}</td>
          <td>${b.points}</td>
          <td>
            <i data-index="${i}"
              class="fa-solid fa-trash text-red-600 cursor-pointer deleteBid"></i>
          </td>
        </tr>
      `;
    });
    refreshBottom();
  }

  /* ================= PANNA RULE ================= */
  function isValidPanna(panna) {
    if (panna.length !== 3) return false;
    return panna[0] === panna[1] && panna[1] === panna[2];
  }

  /* ================= AUTO COPY ================= */
  openPannaInput.addEventListener("input", () => {
    if (openPannaInput.value.length > 3) {
      openPannaInput.value = openPannaInput.value.slice(0, 3);
    }

    closePannaInput.value = openPannaInput.value;
  });

  /* ================= ADD BID ================= */
  addBtn.onclick = () => {

    if (gameClosed) {
      return showMessage("Game Closed ❌", "error");
    }

    const openPanna  = openPannaInput.value;
    const closePanna = closePannaInput.value;
    const points     = Number(pointsInput.value);

    if (!isValidPanna(openPanna)) {
      return showMessage("Only same digit panna allowed (111,222,444)", "error");
    }

    if (!points || points <= 0) {
      return showMessage("Invalid points ❌", "error");
    }

    const existing = bidRegistry.find(b =>
      b.openPanna === openPanna && b.closePanna === closePanna
    );

    if (existing) {
      existing.points += points;
    } else {
      bidRegistry.push({
        openPanna,
        closePanna,
        points,
      });
    }

    openPannaInput.value = "";
    closePannaInput.value = "";
    pointsInput.value = "";

    renderTable();
  };

  /* ================= DELETE ================= */
  betTable.onclick = e => {
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
      const res = await fetch("/full-sangam/place-bet", {
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