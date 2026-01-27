document.addEventListener("DOMContentLoaded", () => {

  const main = document.getElementById("redBracket");
  const modeHalf = document.getElementById("modeHalf");
  const modeFull = document.getElementById("modeFull");
  const inputPoints = document.getElementById("inputPoints");
  const btnAddBid = document.getElementById("btnAddBid");
  const submitBtn = document.getElementById("redBracketSubmitBtnn");

  const bidBody = document.getElementById("bidTableBody");
  const totalBidCount = document.getElementById("totalBidCount");
  const totalPointsSum = document.getElementById("totalPointsSum");

  let bidEntries = [];

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

  /* ================= DIGITS ================= */
  function getDigits(type) {
    if (type === "HALF") {
      return ["05","16","27","38","49","50","61","72","83","94"];
    }
    return ["00","11","22","33","44","55","66","77","88","99"];
  }

  /* ================= RENDER ================= */
  function renderTable() {
    if (bidEntries.length === 0) {
      bidBody.innerHTML =
        `<div class="p-10 text-center text-slate-400 italic text-sm">
          No active bids
        </div>`;
      totalBidCount.innerText = "0";
      totalPointsSum.innerText = "0";
      return;
    }

    bidBody.innerHTML = "";
    let sum = 0;

    bidEntries.forEach((bid, i) => {
      sum += bid.points;

      const row = document.createElement("div");
      row.className =
        "grid grid-cols-4 items-center p-4 text-center hover:bg-emerald-50/40 transition";

      row.innerHTML = `
        <span class="font-bold text-lg">${bid.digit}</span>
        <span class="font-semibold">${bid.points}</span>
        <span>${bid.bracketType}</span>
        <button class="text-rose-500 hover:text-rose-700">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      row.querySelector("button").onclick = () => {
        bidEntries.splice(i, 1);
        renderTable();
      };

      bidBody.appendChild(row);
    });

    totalBidCount.innerText = bidEntries.length;
    totalPointsSum.innerText = sum;
  }

  /* ================= ADD BID ================= */
  btnAddBid.addEventListener("click", () => {
    const points = Number(inputPoints.value);
    if (isNaN(points) || points <= 0)
      return showMessage("Invalid points ❌", "error");

    const type = modeHalf.checked ? "HALF" : "FULL";
    const digits = getDigits(type);

digits.forEach(digit => {
  const existing = bidEntries.find(b => b.digit === digit);

  if (existing) {
    existing.points += points;
  } else {
    bidEntries.push({
      digit,
      points,
      bracketType: type,
      digitCount: digits.length // ✅ ADD THIS
    });
  }
});


    showMessage(`${type} bracket amount updated ➕`);
    renderTable();
  });


 /* ================= SUBMIT ================= */
submitBtn.addEventListener("click", async () => {
  if (bidEntries.length === 0)
    return showMessage("Add at least one bid ❌", "error");

  // Transform digit-wise bidEntries into grouped schema
  const groupedBets = [];

  ["HALF", "FULL"].forEach(type => {
    const digitsOfType = bidEntries.filter(b => b.bracketType === type);
    if (digitsOfType.length > 0) {
      groupedBets.push({
        bracketType: type,
        underDigits: digitsOfType.map(d => d.digit),
        totalPoints: digitsOfType.reduce((sum, d) => sum + d.points, 0)
      });
    }
  });

  try {
    const res = await fetch("/red-bracket/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: main.dataset.gameId,
        gameName: main.dataset.gameName,
        bets: groupedBets // ✅ grouped data for server
      }),
    });

    const data = await res.json();
    if (data.success) {
      showMessage("Bet placed ✅");
      bidEntries = [];
      renderTable();
    } else showMessage(data.message, "error");
  } catch {
    showMessage("Server error ❌", "error");
  }
});

});

