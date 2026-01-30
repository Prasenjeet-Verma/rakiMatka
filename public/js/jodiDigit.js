document.addEventListener("DOMContentLoaded", () => {

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
      background:
        type === "success"
          ? "linear-gradient(135deg,#16a34a,#22c55e)"
          : "linear-gradient(135deg,#dc2626,#ef4444)",
    });

    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
  }

  /* ================= ELEMENTS ================= */
  const openJodiBtn = document.getElementById("btnJodiDigit");
  const jodiMain = document.getElementById("jodiDigit");
  const closeJodiBtn = document.getElementById("closeJodiDigit");
  const jodiTabs = document.getElementById("jodiTabs");
  const jodiGrid = document.getElementById("jodiGrid");
  const jodiTotalDisplay = document.getElementById("jodiTotalAmount");
  const submitBtn = document.getElementById("submitJodiBtn");

  let jodiBidData = {};
  let serverTime = null;
  let jodiLocked = false;

  /* ================= TIME HELPERS ================= */
  const toMinutes = t => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  async function syncServerTime() {
    try {
      const res = await fetch("/server-time");
      const data = await res.json();
      if (data.success) serverTime = data.time;
    } catch {
      console.error("Server time fetch failed");
    }
  }

  function applyLockUI() {
    jodiGrid.querySelectorAll("input").forEach(i => {
      i.disabled = jodiLocked;
      i.placeholder = jodiLocked ? "Closed" : "Points";
    });

    submitBtn.disabled = jodiLocked;
    submitBtn.classList.toggle("opacity-50", jodiLocked);
    submitBtn.classList.toggle("cursor-not-allowed", jodiLocked);
  }

function checkJodiTimeLock() {
  if (!serverTime) return;

  const openTime = jodiMain.dataset.openTime;
  if (!openTime) return;

  const now = toMinutes(serverTime);
  const open = toMinutes(openTime);

  // 🔐 JODI DIGIT = OPEN SE PEHLE ONLY
  jodiLocked = now >= open;
  applyLockUI();
}



  /* ================= TIME SYNC ================= */
  syncServerTime().then(checkJodiTimeLock);
  setInterval(async () => {
    await syncServerTime();
    checkJodiTimeLock();
  }, 5000);

  /* ================= OPEN / CLOSE ================= */
  openJodiBtn?.addEventListener("click", () => {
    jodiMain.classList.remove("hidden");
    initJodi();
  });

  closeJodiBtn?.addEventListener("click", () => {
    jodiMain.classList.add("hidden");
  });

  /* ================= INIT ================= */
  function initJodi() {
    jodiBidData = {};
    jodiTabs.innerHTML = "";
    jodiGrid.innerHTML = "";
    jodiTotalDisplay.innerText = "0";

    for (let i = 0; i <= 9; i++) {
      const tab = document.createElement("button");
      tab.className =
        i === 0
          ? "min-w-[45px] h-[45px] rounded-full bg-[#005c4b] text-white font-bold"
          : "min-w-[45px] h-[45px] rounded-full border text-gray-400";
      tab.innerText = i;
      tab.onclick = () => switchTab(i, tab);
      jodiTabs.appendChild(tab);
    }

    renderJodiGrid(0);
    checkJodiTimeLock();
  }

  function switchTab(index, activeTab) {
    [...jodiTabs.children].forEach(tab =>
      tab.className = "min-w-[45px] h-[45px] rounded-full border text-gray-400"
    );
    activeTab.className =
      "min-w-[45px] h-[45px] rounded-full bg-[#005c4b] text-white font-bold";
    renderJodiGrid(index);
  }

  function renderJodiGrid(mainNo) {
    jodiGrid.innerHTML = "";
    const start = mainNo * 10;

    for (let i = 0; i < 10; i++) {
      const underNo = (start + i).toString().padStart(2, "0");

      const card = document.createElement("div");
      card.className = "flex bg-white border rounded-xl overflow-hidden h-14";

      card.innerHTML = `
        <div class="w-1/3 bg-[#005c4b] text-white flex items-center justify-center font-black">
          ${underNo}
        </div>
        <input type="number" class="w-2/3 text-center font-bold outline-none"
          ${jodiLocked ? "disabled placeholder='Closed'" : "placeholder='Points'"}
        />
      `;

      const input = card.querySelector("input");
      input.addEventListener("input", e => {
        const val = parseInt(e.target.value);
        if (val > 0) jodiBidData[underNo] = { mainNo, underNo, amount: val };
        else delete jodiBidData[underNo];
        updateJodiTotal();
      });

      jodiGrid.appendChild(card);
    }
  }

  function updateJodiTotal() {
    jodiTotalDisplay.innerText = Object.values(jodiBidData)
      .reduce((a, b) => a + b.amount, 0);
  }

  /* ================= SUBMIT (HARD LOCK) ================= */
  window.submitJodiBids = async function () {

    // 🔐 FINAL SERVER CHECK
    try {
      const res = await fetch("/server-time");
      const data = await res.json();

      const now = toMinutes(data.time);
      const open = toMinutes(jodiMain.dataset.openTime);
      const close = toMinutes(jodiMain.dataset.closeTime);

if (now >= open) {
  jodiLocked = true;
  applyLockUI();
  showMessage("Jodi Digit Open Time Over ❌", "error");
  return;
}

    } catch {
      showMessage("Server not reachable ❌", "error");
      return;
    }

    const activeBets = Object.values(jodiBidData);
    if (activeBets.length === 0) {
      showMessage("Please enter points ❌", "error");
      return;
    }

    fetch("/jodi-digit/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: jodiMain.dataset.gameId,
        gameName: jodiMain.dataset.gameName,
        bets: activeBets,
        totalAmount: activeBets.reduce((s, b) => s + b.amount, 0)
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showMessage(data.message || "Bet placed ✅");
          initJodi();
        } else {
          showMessage(data.message || "Bet failed ❌", "error");
        }
      })
      .catch(() => showMessage("Server error ❌", "error"));
  };

});
