document.addEventListener("DOMContentLoaded", () => {

  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("oddEven");
  const bidDisplayArea = document.getElementById("bidDisplayArea");
  const inputPointsAmount = document.getElementById("inputPointsAmount");
  const radioPatternOdd = document.getElementById("radioPatternOdd");
  const radioPatternEven = document.getElementById("radioPatternEven");
  const selectGameTiming = document.getElementById("selectGameTiming");
  const displayTotalCount = document.getElementById("displayTotalCount");
  const displayTotalPoints = document.getElementById("displayTotalPoints");
  const btnTriggerBid = document.getElementById("btnTriggerBid");
  const submitBtn = document.querySelector(".submit-action-btn");
  const closeBtn = document.getElementById("closeOddEven");

  /* ================= STORE ================= */
  let bidRegistry = [];

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

    // disable OPEN in dropdown
    selectGameTiming.querySelector('option[value="OPEN"]').disabled = true;
    if (selectGameTiming.value === "OPEN") {
      selectGameTiming.value = "CLOSE";
    }
  }
}

  syncServerTime().then(checkOpenLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenLock();
  }, 5000);

  /* ================= MESSAGE ================= */
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


/* ================= RENDER ================= */
/* ================= RENDER ================= */
function refreshBidList() {
  if (bidRegistry.length === 0) {
    bidDisplayArea.innerHTML =
      '<div class="empty-state p-10 text-center text-slate-400 italic text-sm">Waiting for selection...</div>';
    displayTotalCount.innerText = "0";
    displayTotalPoints.innerText = "0";
    return;
  }

  bidDisplayArea.innerHTML = "";
  let totalPoints = 0;
  let totalBids = 0;

  bidRegistry.forEach((b, bidIdx) => {
    b.digits.forEach(digit => {
      totalPoints += b.amount; // each digit has the same amount
      totalBids += 1;

      const row = document.createElement("div");
      row.className =
        "grid grid-cols-4 items-center p-4 text-center hover:bg-emerald-50/30 transition-colors";
      row.innerHTML = `
        <span class="font-bold text-xl">${digit}</span>
        <span class="font-semibold">${b.amount}</span>
        <span class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 uppercase">${b.type}</span>
        <i class="fa-solid fa-trash-can text-red-400 cursor-pointer"
           onclick="deleteOddEvenRow(${bidIdx}, ${digit})"></i>
      `;
      bidDisplayArea.appendChild(row);
    });
  });

  displayTotalCount.innerText = totalBids;
  displayTotalPoints.innerText = totalPoints;
}

/* ================= DELETE ================= */
window.deleteOddEvenRow = (bidIdx, digit) => {
  const bid = bidRegistry[bidIdx];
  if (!bid) return;

  // Remove the specific digit from the digits array
  bid.digits = bid.digits.filter(d => d !== digit);

  // If no digits left in the bid object, remove the object entirely
  if (bid.digits.length === 0) bidRegistry.splice(bidIdx, 1);

  refreshBidList();
};

/* ================= ADD BID ================= */
function populateRegistry(mode) {
  const timing = selectGameTiming.value;

  // Open time lock check
  if (openLocked && timing === "OPEN") {
    showMessage("Open session closed ❌", "error");
    return;
  }

  const amount = parseInt(inputPointsAmount.value) || 0;
  if (amount <= 0) {
    showMessage("Enter points ❌", "error");
    return;
  }

  const digits = mode === "odd"
    ? [1, 3, 5, 7, 9]
    : [0, 2, 4, 6, 8];

  // Check if a bid with same pattern and type already exists
  const existingBid = bidRegistry.find(b => b.pattern === mode.toUpperCase() && b.type === timing);

  if (existingBid) {
    // Increment amount
    existingBid.amount += amount;
    showMessage(`${mode.toUpperCase()} ${timing} updated ✅`);
  } else {
    // Create new object
    const newBid = {
      pattern: mode.toUpperCase(),   // ODD / EVEN
      digits,                        // store all digits selected
      amount,
      type: timing,
    };
    bidRegistry.push(newBid);
    showMessage(`${mode.toUpperCase()} ${timing} added ✅`);
  }

  refreshBidList();
}

  /* ================= EVENTS ================= */
  radioPatternOdd.addEventListener("change", () => populateRegistry("odd"));
  radioPatternEven.addEventListener("change", () => populateRegistry("even"));

  btnTriggerBid.addEventListener("click", () => {
    if (radioPatternOdd.checked) populateRegistry("odd");
    else if (radioPatternEven.checked) populateRegistry("even");
    else showMessage("Select Odd or Even ❌", "error");
  });

  /* ================= BUILD BACKEND PAYLOAD ================= */

function buildBackendPayload() {
  if (bidRegistry.length === 0) {
    showMessage("Add bid first ❌", "error");
    return null;
  }

  // Create a separate payload object for each bid
  const payload = bidRegistry.map(b => {
    const underNos = b.digits.map(d => d.toString());
    const totalAmount = b.amount * underNos.length;

    return {
      pattern: b.pattern,       // ODD / EVEN
      underNos,
      amountPerUnderNo: b.amount,
      totalAmount,
      mode: b.type,             // OPEN / CLOSE
    };
  });

  return payload;
}


  /* ================= SUBMIT ================= */
  submitBtn.addEventListener("click", () => {
    const bets = buildBackendPayload();
    if (!bets) return;

    fetch("/odd-even/place-bet", {
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
          bidRegistry = [];
          refreshBidList();
        } else {
          showMessage(d.message, "error");
        }
      })
      .catch(() => showMessage("Server error ❌", "error"));
  });

  /* ================= CLOSE ================= */
  if (closeBtn) closeBtn.onclick = () => {
    bidRegistry = [];
    refreshBidList();
    gameBox.classList.add("hidden");
  };

});
