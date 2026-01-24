document.addEventListener("DOMContentLoaded", () => {
  /* ================= DATA ================= */
  const pattiData = {
    0: [550, 668, 244, 299, 226, 488, 677, 118, 334],
    1: [100, 119, 155, 227, 335, 344, 399, 588, 669],
    2: [200, 110, 228, 255, 336, 499, 660, 688, 778],
    3: [300, 166, 229, 337, 355, 445, 599, 779, 788],
    4: [400, 112, 220, 266, 338, 446, 455, 699, 770],
    5: [500, 113, 122, 177, 339, 366, 447, 799, 889],
    6: [600, 114, 277, 330, 448, 466, 556, 880, 899],
    7: [700, 115, 133, 188, 223, 377, 449, 557, 566],
    8: [800, 116, 224, 233, 288, 440, 477, 558, 990],
    9: [900, 117, 144, 199, 225, 388, 559, 577, 667],
  };

  /* ================= STORE ================= */
  let db_store = [];

  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("DoublePannaBulk");
  const pointsInput = document.getElementById("points-input");
  const bidList = document.getElementById("bid-list");
  const digitGrid = document.getElementById("digit-grid");
  const gameTypeSelect = document.getElementById("game-type");
  const totalBidEl = document.getElementById("total-bid");
  const totalPointsEl = document.getElementById("total-points");
  const closeBtn = document.getElementById("closeDoublePannaBulk");

  /* ================= SERVER TIME ================= */
  let serverTime = null;
  let openLocked = false;

  async function syncServerTime() {
    try {
      const res = await fetch("/server-time");
      const data = await res.json();
      if (data.success) serverTime = data.time;
    } catch {
      console.error("Server time fetch failed");
    }
  }

  function checkOpenLock() {
    if (!gameBox) return;
    const openTime = gameBox.dataset.openTime;
    if (!serverTime || !openTime || openLocked) return;

    if (serverTime >= openTime) {
      openLocked = true;
      showMessage("Open Bet Closed ❌", "error");
    }
  }

  syncServerTime().then(checkOpenLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenLock();
  }, 5000);

  /* ================= MESSAGES ================= */
  function showMessage(msg, type = "success") {
    const box = document.createElement("div");
    box.innerText = msg;
    box.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      padding:12px 26px;border-radius:14px;
      background:${type === "success" ? "#16a34a" : "#dc2626"};
      color:#fff;font-weight:700;z-index:9999
    `;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
  }

  /* ================= HISTORY UI ================= */
  let selectedHistory = [];
  const historyContainer = document.createElement("div");
  historyContainer.className = "mb-4 flex flex-wrap gap-2 items-center min-h-[32px]";
  historyContainer.innerHTML = '<span class="text-xs font-bold text-gray-400 uppercase">Selected:</span>';
  if (digitGrid) digitGrid.parentNode.insertBefore(historyContainer, digitGrid);

  /* ================= DIGIT BUTTONS ================= */
  if (digitGrid) {
    for (let i = 0; i <= 9; i++) {
      const btn = document.createElement("button");
      btn.className = "bg-brand-teal text-white py-3 rounded-xl font-bold transition-all border-4 border-transparent shadow-md active:scale-90";
      btn.innerText = i;
      btn.onclick = () => {
        btn.classList.add("border-accent-green");
        setTimeout(() => btn.classList.remove("border-accent-green"), 300);
        processSelection(i);
      };
      digitGrid.appendChild(btn);
    }
  }

  /* ================= PROCESS SELECTION ================= */
  function processSelection(mainNo) {
    const mode = gameTypeSelect.value;

    if (openLocked && mode === "OPEN") {
      showMessage("Open session closed ❌", "error");
      return;
    }

    const val = parseInt(pointsInput.value) || 0;
    if (val <= 0) {
      showMessage("Enter points ❌", "error");
      return;
    }

    const underNos = pattiData[mainNo];
    const existing = db_store.find(b => b.mainNo === mainNo);

    if (existing) {
      existing.mode = mode;
      existing.amountPerUnderNo = val;
      existing.totalAmount = val * existing.underNos.length;
    } else {
      db_store.push({
        uid: Math.random().toString(36).substr(2, 9),
        mainNo,
        underNos: [...underNos],
        amountPerUnderNo: val,
        totalAmount: val * underNos.length,
        mode,
      });
    }

    updateHistory(mainNo);
    refreshView();
  }

  function updateHistory(num) {
    selectedHistory.push(num);
    const badge = document.createElement("span");
    badge.className = "bg-brand-teal text-white text-xs px-2 py-1 rounded-md font-bold animate-pulse";
    badge.innerText = num;
    historyContainer.appendChild(badge);
    setTimeout(() => badge.classList.remove("animate-pulse"), 500);
  }

  /* ================= REMOVE ROW ================= */
  window.removeRow = (element) => {
    const row = element.closest(".grid");
    const underNo = parseInt(row.children[0].innerText);
    const mainNo = parseInt(row.dataset.mainno);
    const batch = db_store.find(b => b.mainNo === mainNo);
    if (!batch) return;

    batch.underNos = batch.underNos.filter(u => u !== underNo);
    batch.totalAmount = batch.amountPerUnderNo * batch.underNos.length;

    if (batch.underNos.length === 0) {
      db_store = db_store.filter(b => b.mainNo !== mainNo);
    }

    row.remove();
    updateTotals();
  };

  /* ================= REFRESH VIEW ================= */
  function refreshView() {
    bidList.innerHTML = "";
    db_store.forEach(batch => {
      batch.underNos.forEach(underNo => {
        const row = document.createElement("div");
        row.className = "grid grid-cols-4 text-center items-center bg-white py-4 rounded-xl shadow-sm border border-gray-100 mb-2";
        row.dataset.mainno = batch.mainNo;
        row.innerHTML = `
          <span class="text-sm font-bold text-gray-700">${underNo}</span>
          <span class="text-sm text-gray-600 font-medium">${batch.amountPerUnderNo}</span>
          <span class="type-label text-[10px] font-black text-brand-teal bg-teal-50 py-1 rounded-full mx-2 uppercase">${batch.mode}</span>
          <div class="flex justify-center">
            <i class="fa-solid fa-trash-can text-red-400 cursor-pointer p-2 active:text-red-600" onclick="removeRow(this)"></i>
          </div>
        `;
        bidList.prepend(row);
      });
    });
    updateTotals();
  }

  /* ================= UPDATE TOTALS ================= */
  function updateTotals() {
    let totalBids = 0;
    let totalPoints = 0;
    db_store.forEach(batch => {
      totalBids += batch.underNos.length;
      totalPoints += batch.totalAmount;
    });
    totalBidEl.innerText = totalBids;
    totalPointsEl.innerText = totalPoints;
  }

  /* ================= RESET ================= */
  function resetBets() {
    db_store = [];
    selectedHistory = [];
    bidList.innerHTML = "";
    historyContainer.innerHTML = '<span class="text-xs font-bold text-gray-400 uppercase">Selected:</span>';
    pointsInput.value = "";
    gameTypeSelect.value = "OPEN";
    updateTotals();
  }

  /* ================= SUBMIT DATA ================= */
  window.submitData = () => {
    if (db_store.length === 0) {
      showMessage("Enter points first ❌", "error");
      return;
    }

    const bets = db_store.map(batch => ({
      mainNo: batch.mainNo,
      underNos: batch.underNos,
      amountPerUnderNo: batch.amountPerUnderNo,
      totalAmount: batch.totalAmount,
      mode: batch.mode,
    }));

    fetch("/double-panna-bulk/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameBox.dataset.gameId,
        gameName: gameBox.dataset.gameName,
        bets,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          showMessage(d.message, "success");
          resetBets();
        } else {
          showMessage(d.message, "error");
        }
      })
      .catch(() => showMessage("Server error ❌", "error"));
  };

  /* ================= CLOSE BUTTON ================= */
  if (closeBtn) closeBtn.onclick = () => {
    resetBets();
    if (gameBox) gameBox.classList.add("hidden");
  };

  /* ================= INITIAL TOTALS ================= */
  updateTotals();
});
