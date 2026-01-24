document.addEventListener("DOMContentLoaded", () => {
  /* ================= ELEMENTS ================= */
  const gameBox = document.getElementById("halfSugam");
  const inputFields = gameBox.querySelectorAll('input[type="number"]');
  const sessionRadios = gameBox.querySelectorAll('input[name="session"]');
  const addBtn = gameBox.querySelector('button.bg-teal-800');
  const submitBtn = document.getElementById("HalfSangamSubmit");
  const closeBtn = document.getElementById("closeHalfSugam");
  // const bidsDisplay = gameBox.querySelectorAll('.border-t div div.text-gray-600');

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
      showMessage("Open Session Closed ❌", "error");

      // disable open radio
      sessionRadios.forEach(r => {
        if (r.nextElementSibling.innerText === "Open") r.disabled = true;
      });

      // auto switch to close if user had open selected
      const checked = gameBox.querySelector('input[name="session"]:checked');
      if (checked && checked.nextElementSibling.innerText === "Open") {
        sessionRadios.forEach(r => {
          if (r.nextElementSibling.innerText === "Close") r.checked = true;
        });
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
const bidsDisplay = {
  totalBids: document.getElementById("halfSangamBids"),
  totalAmount: document.getElementById("halfSangamAmount")
};

function refreshBottomBar() {
  bidsDisplay.totalBids.innerText = bidRegistry.length;
  bidsDisplay.totalAmount.innerText = bidRegistry.reduce((sum, b) => sum + b.amount, 0);
}


  /* ================= ADD BID ================= */
  addBtn.addEventListener("click", () => {
    const session = gameBox.querySelector('input[name="session"]:checked')?.nextElementSibling.innerText;
    if (!session) {
      showMessage("Select session ❌", "error");
      return;
    }

    if (session === "Open" && openLocked) {
      showMessage("Open session closed ❌", "error");
      return;
    }

    const openDigit = Number(inputFields[0].value);
    const closePanna = Number(inputFields[1].value);
    const amount = Number(inputFields[2].value);

    if (isNaN(openDigit) || isNaN(closePanna) || isNaN(amount) || amount <= 0) {
      showMessage("Fill all fields correctly ❌", "error");
      return;
    }

    // add new object to bidRegistry
    const newBid = {
      session: session.toUpperCase(), // OPEN/CLOSE
      openDigit,
      closePanna,
      amount,
      totalAmount: amount,
    };

    bidRegistry.push(newBid);
    showMessage(`Bid added for ${session} ✅`);
    refreshBottomBar();

    // optionally clear input fields
    inputFields.forEach(f => f.value = '');
  });

  /* ================= SUBMIT ================= */
  submitBtn.addEventListener("click", async () => {
    if (bidRegistry.length === 0) {
      showMessage("Add at least one bid ❌", "error");
      return;
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
      if (data.success) {
        showMessage(data.message, "success");
        bidRegistry = [];
        refreshBottomBar();
      } else {
        showMessage(data.message, "error");
      }
    } catch {
      showMessage("Server error ❌", "error");
    }
  });

  /* ================= CLOSE ================= */
  if (closeBtn) closeBtn.onclick = () => {
    bidRegistry = [];
    refreshBottomBar();
    gameBox.classList.add("hidden");
  };
});
