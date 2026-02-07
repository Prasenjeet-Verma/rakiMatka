/* ================= DATA ================= */
const patti_map = {
  0: [127, 136, 145, 190, 235, 280, 370, 479, 460, 569, 389, 578],
  1: [128, 137, 146, 236, 245, 290, 380, 470, 489, 560, 678, 579],
  2: [129, 138, 147, 156, 237, 246, 345, 390, 480, 570, 679, 589],
  3: [120, 139, 148, 157, 238, 247, 256, 346, 490, 580, 670, 689],
  4: [130, 149, 158, 167, 239, 248, 257, 347, 356, 590, 680, 789],
  5: [140, 159, 168, 230, 249, 258, 267, 348, 357, 456, 690, 780],
  6: [123, 150, 169, 178, 240, 259, 268, 349, 358, 457, 367, 790],
  7: [124, 160, 179, 250, 269, 278, 340, 359, 368, 458, 467, 890],
  8: [125, 134, 170, 189, 260, 279, 350, 369, 378, 459, 567, 468],
  9: [126, 135, 180, 234, 270, 289, 360, 379, 450, 469, 478, 568],
};

/* ================= STORE ================= */
// Each element = { mainNo, underNos: [], amountPerUnderNo, totalAmount, mode, uid }
let db_store = [];

/* ================= ELEMENTS ================= */
const gameBox = document.getElementById("singlePannaBulk");
const toggleBtn = document.getElementById("toggle-session");
const valInput = document.getElementById("val-input");
const scrollArea = document.getElementById("scroll-area");
const statCount = document.getElementById("stat-count");
const statSum = document.getElementById("stat-sum");
const closeBtn = document.getElementById("closeSinglePannaBulk");

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
  const openTime = gameBox.dataset.openTime;
  if (!serverTime || !openTime || openLocked) return;
  if (serverTime >= openTime) {
    openLocked = true;
    toggleBtn.innerText = "CLOSE";
    showMessage("Open Bet Closed ❌", "error");
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

/* ================= TOGGLE SESSION ================= */
function handleToggle() {
  toggleBtn.innerText = toggleBtn.innerText === "OPEN" ? "CLOSE" : "OPEN";
}

/* ================= PROCESS MAINNO SELECTION ================= */
function processSelection(mainNo) {
  if (openLocked && toggleBtn.innerText === "OPEN") {
    showMessage("Open session closed ❌", "error");
    return;
  }

  const val = parseInt(valInput.value) || 0;
  if (val <= 0) {
    showMessage("Enter points ❌", "error");
    return;
  }

  const mode = toggleBtn.innerText;
  const underNos = patti_map[mainNo];

  // 🔥 FIX: mainNo + mode dono check karo
  const existing = db_store.find(
    b => b.mainNo === mainNo && b.mode === mode
  );

  if (existing) {
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

  refreshView();
}


/* ================= REMOVE UNDERNO FROM MAINNO ================= */
function removeUnderNo(mainNo, underNo) {
  const batch = db_store.find(b => b.mainNo === mainNo);
  if (!batch) return;

  batch.underNos = batch.underNos.filter(u => u !== underNo);
  batch.totalAmount = batch.amountPerUnderNo * batch.underNos.length;

  // If no underNos left, remove the batch entirely
  if (batch.underNos.length === 0) {
    db_store = db_store.filter(b => b.mainNo !== mainNo);
  }

  refreshView();
}

/* ================= REFRESH VIEW ================= */
function refreshView() {
  scrollArea.innerHTML = "";
  let total_pts = 0;
  let total_items = 0;

  db_store.forEach(batch => {
    total_pts += batch.totalAmount;
    total_items += batch.underNos.length;

    batch.underNos.forEach(underNo => {
      const row = document.createElement("div");
      row.className =
        "grid grid-cols-4 text-center items-center bg-white py-4 rounded-xl shadow-sm border border-gray-100 mb-2";

      row.innerHTML = `
        <span class="text-sm font-bold text-gray-700">${underNo}</span>
        <span class="text-sm text-gray-600 font-medium">${batch.amountPerUnderNo}</span>
        <span class="type-label text-[10px] font-black text-brand-teal bg-teal-50 py-1 rounded-full mx-2 uppercase">${batch.mode}</span>
        <button onclick="removeUnderNo(${batch.mainNo}, ${underNo})" class="hover:text-red-500 transition-colors">
          <i class="fa-solid fa-trash-can text-red-400 cursor-pointer p-2 active:text-red-600"></i>
        </button>
      `;
      scrollArea.appendChild(row);
    });
  });

  statCount.innerText = db_store.length;
  statSum.innerText = total_pts;
}

/* ================= RESET ================= */
function resetBulkBets() {
  db_store = [];
  refreshView();
  valInput.value = "";
  toggleBtn.innerText = "OPEN";
}

/* ================= SUBMIT BETS ================= */
function submitBulkBets() {
  if (db_store.length === 0) {
    showMessage("Enter points first ❌", "error");
    return;
  }

  // Format bets for backend schema
  const bets = db_store.map(batch => ({
    mainNo: batch.mainNo,
    underNos: batch.underNos,
    amountPerUnderNo: batch.amountPerUnderNo,
    totalAmount: batch.totalAmount,
    mode: batch.mode,
  }));

  fetch("/single-panna-bulk/place-bet", {
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
        resetBulkBets();
      } else {
        showMessage(d.message, "error");
      }
    })
    .catch(() => showMessage("Server error ❌", "error"));
}

/* ================= CLOSE BUTTON ================= */
closeBtn.onclick = () => {
  resetBulkBets();
  gameBox.classList.add("hidden");
};
