document.addEventListener("DOMContentLoaded", () => {
  /* ================= DATA ================= */
  const g_data_store = {
    0: ["550","668","244","299","226","488","677","118","334"],
    1: ["100","119","155","227","335","344","399","588","669"],
    2: ["200","110","228","255","336","499","660","688","778"],
    3: ["300","166","229","337","355","445","599","779","788"],
    4: ["400","112","220","266","338","446","455","699","770"],
    5: ["500","113","122","177","339","366","447","799","889"],
    6: ["600","114","277","330","448","466","556","880","899"],
    7: ["700","115","133","188","223","377","449","557","566"],
    8: ["800","116","224","233","288","440","477","558","990"],
    9: ["900","117","144","199","225","388","559","577","667"],
  };

  let g_ledger = {};
  let g_active_digit = "0";
  let g_active_mode = "OPEN";

  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("DoublePanna");
  const tabWrap = document.getElementById("g-tab-wrapper");
  const grid = document.getElementById("g-main-grid");
  const totalEl = document.getElementById("g-total-display");
  const modeSelect = document.getElementById("g-game-selector");
  const closeBtn = document.getElementById("closeDoublePanna");
  const submitBtn = gameBox.querySelector("button");

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

  /* ================= SERVER TIME LOCK ================= */
  let serverTime = null;
  let openTime = gameBox.dataset.openTime;
  let openLocked = false;

  async function syncServerTime() {
    const res = await fetch("/server-time");
    const data = await res.json();
    if (data.success) serverTime = data.time;
  }

  function checkOpenLock() {
    if (!serverTime || !openTime || openLocked) return;
    if (serverTime >= openTime) {
      openLocked = true;
      g_active_mode = "CLOSE";
      modeSelect.value = "CLOSE";
      modeSelect
        .querySelector("option[value='OPEN']")
        ?.setAttribute("disabled", true);
      showMessage("Open Bet Closed ❌", "error");
      buildGrid(g_active_digit);
    }
  }

  syncServerTime().then(checkOpenLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenLock();
  }, 5000);

  /* ================= MODE CHANGE ================= */
  window.updateGameMode = (val) => {
    g_active_mode = val;
    buildGrid(g_active_digit);
  };

  /* ================= TABS ================= */
  function buildTabs() {
    tabWrap.innerHTML = "";
    for (let i = 0; i <= 9; i++) {
      const btn = document.createElement("button");
      btn.innerText = i;
      btn.className = `
        min-w-[40px] h-10 rounded-full border-2 font-black
        ${g_active_digit == i
          ? "bg-[#005c4b] text-white"
          : "bg-white text-gray-400"}
      `;
      btn.onclick = () => {
        g_active_digit = i.toString();
        buildTabs();
        buildGrid(g_active_digit);
      };
      tabWrap.appendChild(btn);
    }
  }

  /* ================= GRID ================= */
  function buildGrid(digit) {
    grid.innerHTML = "";
    g_data_store[digit].forEach((panna) => {
      const key = `${g_active_mode}-${panna}`;
      const val = g_ledger[key] || "";
      grid.innerHTML += `
        <div class="flex border rounded-xl overflow-hidden">
          <div class="w-2/5 bg-[#005c4b] text-white flex items-center justify-center font-bold">${panna}</div>
          <input type="number"
            value="${val}"
            placeholder="0"
            class="w-3/5 text-center font-bold outline-none"
            oninput="updateDoublePanna('${panna}',this.value)"
          />
        </div>
      `;
    });
  }

  /* ================= INPUT ================= */
  window.updateDoublePanna = (panna, val) => {
    const key = `${g_active_mode}-${panna}`;
    if (!val || val <= 0) delete g_ledger[key];
    else g_ledger[key] = parseInt(val);
    refreshTotal();
  };

  function refreshTotal() {
    const sum = Object.values(g_ledger).reduce((a, b) => a + b, 0);
    totalEl.innerText = sum;
  }

  /* ================= SUBMIT ================= */
  submitBtn.onclick = () => {
    if (Object.keys(g_ledger).length === 0) {
      showMessage("Enter amount first ❌", "error");
      return;
    }

    const bets = Object.entries(g_ledger).map(([key, amount]) => {
      const [mode, panna] = key.split("-");
      return {
        mainNo: Number(panna[0]),
        underNo: panna,
        amount,
        mode,
      };
    });

    fetch("/starline-double-panna/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameBox.dataset.gameId,
        gameName: gameBox.dataset.gameName,
        bets,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          showMessage(d.message, "success");
          resetDoublePanna();
        } else showMessage(d.message, "error");
      })
      .catch(() => showMessage("Server error ❌", "error"));
  };

  /* ================= RESET ================= */
  function resetDoublePanna() {
    g_ledger = {};
    g_active_digit = "0";
    g_active_mode = "OPEN";
    modeSelect.value = "OPEN";
    totalEl.innerText = "0";
    buildTabs();
    buildGrid(g_active_digit);
  }

  closeBtn.onclick = () => {
    resetDoublePanna();
    gameBox.classList.add("hidden");
  };

  /* ================= INIT ================= */
  buildTabs();
  buildGrid(g_active_digit);
});
