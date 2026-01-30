document.addEventListener("DOMContentLoaded", () => {

  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("halfSugam");
  const openDigitInput = document.getElementById("openDigit");
  const closePannaInput = document.getElementById("closePanna");
  const pointsInput = document.getElementById("points");
  const addBtn = document.getElementById("addBid");
  const submitBtn = document.getElementById("HalfSangamSubmit");
  const betTable = document.getElementById("halfsangambetTable");
  const sessionRadios = gameBox.querySelectorAll('input[name="session"]');

  const bidsDisplay = {
    totalBids: document.getElementById("halfSangamBids"),
    totalAmount: document.getElementById("halfSangamAmount"),
  };

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
    const openTime = gameBox.dataset.openTime;
    if (!serverTime || !openTime || openLocked) return;

    if (serverTime >= openTime) {
      openLocked = true;
      showMessage("Open Session Closed ❌", "error");

      // disable OPEN radio
      sessionRadios.forEach(r => {
        if (r.nextElementSibling.innerText === "Open") {
          r.disabled = true;
        }
      });

      // auto switch to CLOSE
      const checked = gameBox.querySelector('input[name="session"]:checked');
      if (checked && checked.nextElementSibling.innerText === "Open") {
        sessionRadios.forEach(r => {
          if (r.nextElementSibling.innerText === "Close") {
            r.checked = true;
          }
        });
      }
    }
  }

  syncServerTime().then(checkOpenLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenLock();
  }, 5000);

  /* ================= TOAST MESSAGE ================= */
  function showMessage(msg, type = "success") {
    const box = document.createElement("div");
    box.innerText = msg;

    box.style.cssText = `
      position:fixed;
      top:20px;
      left:50%;
      transform:translateX(-50%);
      padding:12px 26px;
      border-radius:14px;
      background:${type === "success" ? "#16a34a" : "#dc2626"};
      color:#fff;
      font-weight:700;
      z-index:9999;
      box-shadow:0 10px 25px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
  }

  /* ================= UI HELPERS ================= */
  function refreshBottom() {
    bidsDisplay.totalBids.innerText = bidRegistry.length;
    bidsDisplay.totalAmount.innerText =
      bidRegistry.reduce((s, b) => s + b.totalAmount, 0);
  }

  function renderTable() {
    betTable.innerHTML = "";
    bidRegistry.forEach((b, i) => {
      betTable.innerHTML += `
        <tr>
          <td>${b.session}</td>
          <td>${b.openDigit}</td>
          <td>${b.closePanna}</td>
          <td>${b.totalAmount}</td>
          <td>
            <i data-index="${i}"
              class="fa-solid fa-trash text-red-600 cursor-pointer deleteBid"></i>
          </td>
        </tr>
      `;
    });
    refreshBottom();
  }

  /* ================= AUTO COPY OPEN → CLOSE ================= */
  openDigitInput.addEventListener("input", () => {
    if (openDigitInput.value.length > 3) {
      openDigitInput.value = openDigitInput.value.slice(0, 3);
    }

    if (openDigitInput.value.length === 3) {
      closePannaInput.value = openDigitInput.value;
    } else {
      closePannaInput.value = "";
    }
  });

  /* ================= ADD BID ================= */
  addBtn.onclick = () => {

    const session =
      gameBox.querySelector('input[name="session"]:checked')
        ?.nextElementSibling.innerText.toUpperCase();

    if (session === "OPEN" && openLocked) {
      return showMessage("Open session closed ❌", "error");
    }

    const openDigit = openDigitInput.value;
    const closePanna = closePannaInput.value;
    const points = Number(pointsInput.value);

    if (openDigit.length !== 3) {
      return showMessage("Open Digit must be exactly 3 digits ❌", "error");
    }

    if (!points || points <= 0) {
      return showMessage("Invalid points ❌", "error");
    }

    const existing = bidRegistry.find(b =>
      b.session === session &&
      b.openDigit === Number(openDigit) &&
      b.closePanna === Number(closePanna)
    );

    if (existing) {
      existing.totalAmount += points;
    } else {
      bidRegistry.push({
        session,
        openDigit: Number(openDigit),
        closePanna: Number(closePanna),
        totalAmount: points,
      });
    }

    openDigitInput.value = "";
    closePannaInput.value = "";
    pointsInput.value = "";

    renderTable();
  };

  /* ================= DELETE BID ================= */
  betTable.onclick = e => {
    if (e.target.classList.contains("deleteBid")) {
      bidRegistry.splice(e.target.dataset.index, 1);
      renderTable();
    }
  };

  /* ================= SUBMIT ================= */
  submitBtn.onclick = async () => {
    if (!bidRegistry.length) {
      return showMessage("Add at least one bid ❌", "error");
    }

    try {
      const res = await fetch("/half-sangam/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameBox.dataset.gameId,
          gameName: gameBox.dataset.gameName,
          bets: bidRegistry,
        }),
      });

      const data = await res.json();
      showMessage(data.message, data.success ? "success" : "error");

      if (data.success) {
        bidRegistry = [];
        renderTable();
      }
    } catch {
      showMessage("Server error ❌", "error");
    }
  };

});