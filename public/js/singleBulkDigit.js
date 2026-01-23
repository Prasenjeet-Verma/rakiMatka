document.addEventListener("DOMContentLoaded", () => {
  /* ================= ELEMENTS ================= */
  const openBtn = document.getElementById("btnBulkDigit");
  const gameBox = document.getElementById("SingleBulkDigit");
  const closeBtn = document.getElementById("closeBulk");

  const gridContainer = document.getElementById("gridContainer");
  const pointsInput = document.getElementById("pointsInput");
  const totalBidsDisplay = document.getElementById("totalBids");
  const totalAmountDisplay = document.getElementById("totalAmount");

  /* ================= STATE ================= */
  let bets = Array(10).fill(null); // each item: {amount, mode} or null
  let holdTimer = null;

  let serverTime = null;
  let openTime = gameBox.dataset.openTime; // HH:mm
  let closeTime = gameBox.dataset.closeTime; // HH:mm

  /* ================= MESSAGE BOX ================= */
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
      padding: "12px 24px",
      borderRadius: "12px",
      color: "#fff",
      fontWeight: "600",
      zIndex: "9999",
      boxShadow: "0 10px 25px rgba(0,0,0,.25)",
      transition: "all .4s ease",
      background: type === "success" ? "#16a34a" : "#dc2626",
    });

    document.body.appendChild(box);

    setTimeout(() => {
      box.style.opacity = "0";
      box.style.top = "0px";
    }, 4500);

    setTimeout(() => box.remove(), 5000);
  }

  /* ================= SERVER TIME ================= */
  async function syncServerTime() {
    try {
      const res = await fetch("/server-time");
      const data = await res.json();
      if (data.success) serverTime = data.time;
    } catch {
      console.log("time sync failed");
    }
  }

  /* ================= SESSION LOCK CHECK ================= */
  function checkSessionLock() {
    if (!serverTime || !openTime || !closeTime) return;

    const selectedSession = document.querySelector(
      'input[name="sessionSB"]:checked'
    )?.value;

    const serverMoment = moment(serverTime, "HH:mm");
    const openMoment = moment(openTime, "HH:mm");

    if (selectedSession === "OPEN" && serverMoment.isSameOrAfter(openMoment)) {
      const openRadio = document.querySelector(
        'input[name="sessionSB"][value="OPEN"]'
      );
      if (openRadio) openRadio.disabled = true;

      document.querySelector(
        'input[name="sessionSB"][value="CLOSE"]'
      ).checked = true;

      showMessage("Open Time Bet Close ❌", "error");
    }
  }

  /* ================= AUTO CHECK SERVER TIME ================= */
  syncServerTime().then(checkSessionLock);
  setInterval(async () => {
    await syncServerTime();
    checkSessionLock();
  }, 5000);

  /* ================= OPEN / CLOSE UI ================= */
  openBtn.addEventListener("click", () => {
    gameBox.classList.remove("hidden");
    initGrid();
  });

  closeBtn.addEventListener("click", () => {
    gameBox.classList.add("hidden");
  });

  /* ================= GRID INIT ================= */
  function initGrid() {
    gridContainer.innerHTML = "";
    bets = Array(10).fill(null); // reset all bets
    pointsInput.value = "";
    updateUI();

    for (let i = 0; i < 10; i++) {
      const card = document.createElement("div");
      card.className =
        "digit-card relative w-16 h-16 flex items-center justify-center rounded-xl bg-teal-800 text-white text-xl font-bold cursor-pointer select-none";
      card.innerText = i;

      card.onclick = () => handleCardClick(i);
      card.onmousedown = () => startHold(i);
      card.onmouseup = endHold;
      card.onmouseleave = endHold;
      card.ontouchstart = () => startHold(i);
      card.ontouchend = endHold;

      gridContainer.appendChild(card);
    }
  }

  /* ================= HANDLE CARD CLICK ================= */
function handleCardClick(index) {
  const pointsRaw = pointsInput.value.trim();
  const points = parseInt(pointsRaw, 10);

  // 1️⃣ Check if points entered
  if (!pointsRaw || isNaN(points) || points <= 0) {
    showMessage("Enter points first ❌", "error");
    return;
  }

  // 2️⃣ Check if session selected
  const sessionRadio = document.querySelector('input[name="sessionSB"]:checked');
  if (!sessionRadio) {
    showMessage("Please select Open or Close session ❌", "error");
    return;
  }

  const selectedMode = sessionRadio.value;

  bets[index] = { amount: points, mode: selectedMode };
  updateUI();
}



  /* ================= HOLD TO CLEAR ================= */
  function startHold(index) {
    holdTimer = setTimeout(() => {
      bets[index] = null; // clear properly
      if (navigator.vibrate) navigator.vibrate(40);
      updateUI();
    }, 700);
  }

  function endHold() {
    clearTimeout(holdTimer);
  }

  /* ================= UPDATE UI ================= */
  function updateUI() {
    let totalBids = 0;
    let totalAmount = 0;

    document.querySelectorAll(".digit-card").forEach((card, i) => {
      const val = bets[i];
      const badge = card.querySelector(".badge");
      if (badge) badge.remove();

      if (val) {
        totalBids++;
        totalAmount += val.amount;

        const span = document.createElement("span");
        span.className =
          "badge absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full";
        span.innerText = `${val.amount} (${val.mode[0]})`;

        card.appendChild(span);
        card.classList.add("brightness-125");
      } else {
        card.classList.remove("brightness-125");
      }
    });

    totalBidsDisplay.innerText = totalBids;
    totalAmountDisplay.innerText = totalAmount;
  }

  /* ================= SUBMIT BIDS ================= */
  window.submitBidsofsinglebulk = function () {
    const session = document.querySelector(
      'input[name="sessionSB"]:checked'
    ).value;

    const serverMoment = moment(serverTime, "HH:mm");
    const openMoment = moment(openTime, "HH:mm");
    const closeMoment = moment(closeTime, "HH:mm");

    if (session === "OPEN" && serverMoment.isSameOrAfter(openMoment)) {
      showMessage("Open Time Bet Close ❌", "error");
      return;
    }

    if (session === "CLOSE" && serverMoment.isSameOrAfter(closeMoment)) {
      showMessage("Close Time Bet Close ❌", "error");
      return;
    }

    const activeBids = bets
      .map((b, number) => b && { number, amount: b.amount, mode: b.mode })
      .filter(b => b);

    if (activeBids.length === 0) {
      showMessage("Please place at least one bet ❌", "error");
      return;
    }

    fetch("/single-bulk-digit/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameBox.dataset.gameId,
        gameName: gameBox.dataset.gameName,
        bets: activeBids,
        totalAmount: activeBids.reduce((s, b) => s + b.amount, 0),
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showMessage(data.message || "Bet placed successfully ✅");
          initGrid(); // reset grid after successful bet
        } else {
          showMessage(data.message || "Bet failed ❌", "error");
        }
      })
      .catch(() => showMessage("Server error ❌", "error"));
  };
});
