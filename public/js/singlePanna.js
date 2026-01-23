document.addEventListener("DOMContentLoaded", () => {

  /* ================= DATA ================= */
  const pattiData = {
    0: ["127","136","145","190","235","280","370","389","460","479","569","578"],
    1: ["128","137","146","236","245","290","380","470","489","560","678","579"],
    2: ["129","138","147","156","237","246","345","390","480","570","679","589"],
    3: ["120","139","148","157","238","247","256","346","490","580","670","689"],
    4: ["130","149","158","167","239","248","257","347","356","590","680","789"],
    5: ["140","159","168","230","249","258","267","348","357","456","690","780"],
    6: ["123","150","169","178","240","259","268","349","358","457","367","790"],
    7: ["124","160","179","250","269","278","340","359","368","458","467","890"],
    8: ["125","134","170","189","260","279","350","369","378","459","567","468"],
    9: ["126","135","180","234","270","289","360","379","450","469","478","568"],
  };

  /* ================= STATE ================= */
  let allBids = {
    open: {},
    close: {}
  };

  let serverTime = null;
  let openLocked = false;

  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("singlePanna");
  const digitBar = document.getElementById("digitBar");
  const pattiGrid = document.getElementById("pattiGrid");
  const totalEl = document.getElementById("grandTotal");
  const betTypeSel = document.getElementById("betType");
  const closeBtn = document.getElementById("closeSinglePanna");

  const openTime = gameBox.dataset.openTime;

  /* ================= HELPERS ================= */
  const currentMode = () => betTypeSel.value;

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

  /* ================= SERVER TIME ================= */
  async function syncServerTime() {
    const res = await fetch("/server-time");
    const data = await res.json();
    if (data.success) serverTime = data.time;
  }

  function checkOpenLock() {
    if (!serverTime || !openTime || openLocked) return;
    if (serverTime >= openTime) {
      openLocked = true;
      betTypeSel.value = "close";
      betTypeSel.querySelector("option[value='open']").disabled = true;
      showMessage("Open Bet Closed ❌", "error");
    }
  }

  syncServerTime().then(checkOpenLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenLock();
  }, 5000);

  /* ================= INIT DIGITS ================= */
  function init() {
    for (let i = 0; i <= 9; i++) {
      const btn = document.createElement("button");
      btn.id = `btn-${i}`;
      btn.innerText = i;
      btn.className =
        "min-w-[48px] h-[48px] border-2 border-[#005c4b] rounded-xl font-bold";
      btn.onclick = () => loadDigit(i);
      digitBar.appendChild(btn);
    }
    loadDigit(0);
  }

  /* ================= LOAD PANNA ================= */
  function loadDigit(digit) {
    digitBar.querySelectorAll("button")
      .forEach(b => b.classList.remove("bg-[#005c4b]", "text-white"));

    document.getElementById(`btn-${digit}`)
      .classList.add("bg-[#005c4b]", "text-white");

    const mode = currentMode();
    pattiGrid.innerHTML = "";

    pattiData[digit].forEach(panna => {
      const val = allBids[mode][panna] || "";
      pattiGrid.innerHTML += `
        <div class="flex border rounded-xl overflow-hidden h-14">
          <div class="w-2/5 bg-gray-100 flex items-center justify-center font-bold">${panna}</div>
          <input type="number"
            value="${val}"
            class="w-3/5 text-center font-bold outline-none"
            oninput="updatePannaBid('${panna}', this.value)"
          />
        </div>`;
    });
  }

  /* ================= UPDATE BID ================= */
  window.updatePannaBid = (panna, val) => {
    const mode = currentMode();
    if (!val || val <= 0) {
      delete allBids[mode][panna];
    } else {
      allBids[mode][panna] = parseInt(val);
    }
    calculateTotal();
  };

  function calculateTotal() {
    const total =
      Object.values(allBids.open).reduce((a, b) => a + b, 0) +
      Object.values(allBids.close).reduce((a, b) => a + b, 0);

    totalEl.innerText = total;
  }

  /* ================= MODE CHANGE ================= */
  betTypeSel.addEventListener("change", () => {
    const activeBtn = digitBar.querySelector(".bg-[#005c4b]");
    const digit = activeBtn ? activeBtn.innerText : 0;
    loadDigit(digit);
  });

  /* ================= RESET ================= */
  function resetSinglePanna() {
    allBids = { open: {}, close: {} };
    totalEl.innerText = "0";
    betTypeSel.value = "open";
    loadDigit(0);
  }

  /* ================= SUBMIT ================= */
 window.submitBids = () => {
  const payloadBets = [];

  ["open", "close"].forEach(modeKey => {
    Object.entries(allBids[modeKey]).forEach(([panna, amount]) => {
      payloadBets.push({
        mainNo: Number(panna[0]),
        underNo: panna,
        amount,
        mode: modeKey.toUpperCase() // 🔥 IMPORTANT
      });
    });
  });

  if (payloadBets.length === 0) {
    showMessage("Enter amount first ❌", "error");
    return;
  }

  fetch("/single-panna/place-bet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameId: gameBox.dataset.gameId,
      gameName: gameBox.dataset.gameName,
      bets: payloadBets
    })
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        showMessage(d.message, "success");
        resetSinglePanna();
      } else {
        showMessage(d.message, "error");
      }
    })
    .catch(() => showMessage("Server error ❌", "error"));
};
  /* ================= CLOSE ================= */

  closeBtn.onclick = () => {
    resetSinglePanna();
    gameBox.classList.add("hidden");
  };

  init();
});
