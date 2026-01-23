document.addEventListener("DOMContentLoaded", () => {
  /* ================= DATA ================= */
  const pattiData = {
    0: [
      "127",
      "136",
      "145",
      "190",
      "235",
      "280",
      "370",
      "389",
      "460",
      "479",
      "569",
      "578",
    ],
    1: [
      "128",
      "137",
      "146",
      "236",
      "245",
      "290",
      "380",
      "470",
      "489",
      "560",
      "678",
      "579",
    ],
    2: [
      "129",
      "138",
      "147",
      "156",
      "237",
      "246",
      "345",
      "390",
      "480",
      "570",
      "679",
      "589",
    ],
    3: [
      "120",
      "139",
      "148",
      "157",
      "238",
      "247",
      "256",
      "346",
      "490",
      "580",
      "670",
      "689",
    ],
    4: [
      "130",
      "149",
      "158",
      "167",
      "239",
      "248",
      "257",
      "347",
      "356",
      "590",
      "680",
      "789",
    ],
    5: [
      "140",
      "159",
      "168",
      "230",
      "249",
      "258",
      "267",
      "348",
      "357",
      "456",
      "690",
      "780",
    ],
    6: [
      "123",
      "150",
      "169",
      "178",
      "240",
      "259",
      "268",
      "349",
      "358",
      "457",
      "367",
      "790",
    ],
    7: [
      "124",
      "160",
      "179",
      "250",
      "269",
      "278",
      "340",
      "359",
      "368",
      "458",
      "467",
      "890",
    ],
    8: [
      "125",
      "134",
      "170",
      "189",
      "260",
      "279",
      "350",
      "369",
      "378",
      "459",
      "567",
      "468",
    ],
    9: [
      "126",
      "135",
      "180",
      "234",
      "270",
      "289",
      "360",
      "379",
      "450",
      "469",
      "478",
      "568",
    ],
  };

  let allBids = {}; // { "127": 50, "136": 20 }

  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("singlePanna");
  const digitBar = document.getElementById("digitBar");
  const pattiGrid = document.getElementById("pattiGrid");
  const totalEl = document.getElementById("grandTotal");
  const betTypeSel = gameBox.querySelector("select");
  const closeBtn = document.getElementById("closeSinglePanna");

  let serverTime = null;
  let openTime = gameBox.dataset.openTime;
  let openLocked = false;

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
  async function syncServerTime() {
    const res = await fetch("/server-time");
    const data = await res.json();
    if (data.success) serverTime = data.time;
  }

  function checkOpenLock() {
    if (!serverTime || !openTime || openLocked) return;
    if (serverTime >= openTime) {
      openLocked = true;
      betTypeSel.value = "CLOSE";
      betTypeSel
        .querySelector("option[value='OPEN']")
        ?.setAttribute("disabled", true);
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
    digitBar
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("bg-[#005c4b]", "text-white"));
    const active = document.getElementById(`btn-${digit}`);
    active.classList.add("bg-[#005c4b]", "text-white");

    pattiGrid.innerHTML = "";
    pattiData[digit].forEach((panna) => {
      const val = allBids[panna] || "";
      pattiGrid.innerHTML += `
        <div class="flex border rounded-xl overflow-hidden h-14">
          <div class="w-2/5 bg-gray-100 flex items-center justify-center font-bold">${panna}</div>
          <input type="number"
            value="${val}"
            class="w-3/5 text-center font-bold outline-none"
            oninput="updatePannaBid('${panna}',this.value)"
          />
        </div>`;
    });
  }

  /* ================= UPDATE ================= */
  window.updatePannaBid = (panna, val) => {
    if (!val || val <= 0) delete allBids[panna];
    else allBids[panna] = parseInt(val);
    calculateTotal();
  };

  function calculateTotal() {
    const total = Object.values(allBids).reduce((a, b) => a + b, 0);
    totalEl.innerText = total;
  }

  /* ================= RESET ================= */
  function resetSinglePanna() {
  // 1️⃣ clear all bids data
  allBids = {};

  // 2️⃣ reset total
  totalEl.innerText = "0";

  // 3️⃣ reset bet type (OPEN default)
  betTypeSel.value = "open";

  // 4️⃣ reset digit selection (0)
  digitBar
    .querySelectorAll("button")
    .forEach(b => b.classList.remove("bg-[#005c4b]", "text-white"));

  const firstBtn = document.getElementById("btn-0");
  if (firstBtn) {
    firstBtn.classList.add("bg-[#005c4b]", "text-white");
  }

  // 5️⃣ reload panna grid → 🔥 ALL INPUTS CLEAR
  loadDigit(0);
}


  /* ================= SUBMIT ================= */
  window.submitBids = () => {
    if (Object.keys(allBids).length === 0) {
      showMessage("Enter amount first ❌", "error");
      return;
    }

    const bets = Object.entries(allBids).map(([panna, amount]) => ({
      mainNo: Number(panna[0]),
      underNo: panna,
      amount,
    }));

    fetch("/single-panna/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameBox.dataset.gameId,
        gameName: gameBox.dataset.gameName,
        betType: betTypeSel.value,
        bets,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          showMessage(d.message, "success");
          resetSinglePanna(); // 🔥 yahin add karna hai
        } else {
          showMessage(d.message, "error");
        }
      })
      .catch(() => showMessage("Server error ❌", "error"));
  };

  closeBtn.onclick = () => {
    resetSinglePanna(); // 🔥 clear everything
    gameBox.classList.add("hidden");
  };

  init();
});
