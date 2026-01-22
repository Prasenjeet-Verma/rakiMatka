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
  let bets = Array(10).fill(0);
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
      'input[name="session"]:checked'
    )?.value;

    // OPEN session lock
    if (selectedSession === "OPEN" && serverTime >= openTime) {
      const openRadio = document.querySelector(
        'input[name="session"][value="OPEN"]'
      );
      if (openRadio) openRadio.disabled = true;

      document.querySelector(
        'input[name="session"][value="CLOSE"]'
      ).checked = true;

      showMessage("Open Time Bet Close ❌", "error");
    }

    // OPTIONAL: CLOSE session lock after closeTime (controller already blocks)
    // if needed, can add UI disable for CLOSE too
  }

  /* ================= AUTO CHECK EVERY 5 SEC ================= */
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
    bets = Array(10).fill(0);
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

  /* ================= CLICK ================= */
  function handleCardClick(index) {
    const session = document.querySelector(
      'input[name="session"]:checked'
    ).value;

    // ❌ OPEN session blocked after openTime
    if (session === "OPEN" && serverTime >= openTime) {
      showMessage("Open Time Bet Close ❌", "error");
      return;
    }

    const points = parseInt(pointsInput.value);
    if (!points || points <= 0) {
      showMessage("Enter points first ❌", "error");
      return;
    }

    bets[index] = bets[index] === 0 ? points : bets[index] * 2;
    updateUI();
  }

  /* ================= HOLD TO CLEAR ================= */
  function startHold(index) {
    holdTimer = setTimeout(() => {
      bets[index] = 0;
      if (navigator.vibrate) navigator.vibrate(40);
      updateUI();
    }, 700);
  }

  function endHold() {
    clearTimeout(holdTimer);
  }

  /* ================= UI UPDATE ================= */
  function updateUI() {
    let totalBids = 0;
    let totalAmount = 0;

    document.querySelectorAll(".digit-card").forEach((card, i) => {
      const val = bets[i];
      const badge = card.querySelector(".badge");
      if (badge) badge.remove();

      if (val > 0) {
        totalBids++;
        totalAmount += val;

        const span = document.createElement("span");
        span.className =
          "badge absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full";
        span.innerText = val;

        card.appendChild(span);
        card.classList.add("brightness-125");
      } else {
        card.classList.remove("brightness-125");
      }
    });

    totalBidsDisplay.innerText = totalBids;
    totalAmountDisplay.innerText = totalAmount;
  }

  /* ================= SUBMIT ================= */
  window.submitBids = function () {
    const session = document.querySelector(
      'input[name="session"]:checked'
    ).value;

    if (session === "OPEN" && serverTime >= openTime) {
      showMessage("Open Time Bet Close ❌", "error");
      return;
    }

    const activeBids = bets
      .map((amount, number) => ({ number, amount }))
      .filter(b => b.amount > 0);

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
        session,
        bets: activeBids,
        totalAmount: activeBids.reduce((s, b) => s + b.amount, 0),
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showMessage(data.message || "Bet placed successfully ✅");
          initGrid();
        } else {
          showMessage(data.message || "Bet failed ❌", "error");
        }
      })
      .catch(() => showMessage("Server error ❌", "error"));
  };
});
