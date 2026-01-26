document.addEventListener("DOMContentLoaded", () => {
  // ✅ Main container and close button
  const main = document.getElementById("dPMotor ");
  const closeBtn = document.getElementById("closeDPMotor ");

  // ✅ Inputs and buttons with updated IDs/names
  const sessionRadios = main.querySelectorAll('input[name="dpmotor_session"]');
  const openDigitInput = document.getElementById("dpmotor_opendigit");
  const pointsInput = document.getElementById("dpmotor_points");
  const addBtn = document.getElementById("dpmotor_addbtn");
  const submitBtn = document.getElementById("dpmotor_submitbtn");

  // ✅ Bottom bar
  const bidsDisplay = {
    totalBids: main.querySelector('.dpmotor_totalbids'),
    totalAmount: main.querySelector('.dpmotor_totalamount')
  };

  let bidRegistry = [];
  let serverTime = null;
  let openLocked = false;

  // 🔄 Sync server time
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
    const openTime = main.dataset.openTime;
    if (!serverTime || !openTime || openLocked) return;

    if (serverTime >= openTime) {
      openLocked = true;
      showMessage("Open session closed ❌", "error");

      sessionRadios.forEach(r => {
        if (r.nextElementSibling.innerText === "Open") r.disabled = true;
      });

      const checked = main.querySelector('input[name="dpmotor_session"]:checked');
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

  // ⚡ Show message helper
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

  // 🔄 Refresh bottom bar
  function refreshBottomBar() {
    bidsDisplay.totalBids.innerText = bidRegistry.length;
    bidsDisplay.totalAmount.innerText = bidRegistry.reduce((sum, b) => sum + b.points, 0);
  }

  // ➕ Add button click
  addBtn.addEventListener("click", () => {
    const session = main.querySelector('input[name="dpmotor_session"]:checked')?.nextElementSibling.innerText;
    if (!session) return showMessage("Select session ❌", "error");
    if (session === "Open" && openLocked) return showMessage("Open session closed ❌", "error");

    const openDigit = Number(openDigitInput.value);
    const points = Number(pointsInput.value);
    if (isNaN(openDigit) || isNaN(points) || points <= 0) return showMessage("Fill all fields correctly ❌", "error");

    bidRegistry.push({
      session: session.toUpperCase(),
      openDigit,
      points,
      totalAmount: points
    });

    showMessage(`Bid added for ${session} ✅`);
    refreshBottomBar();

    openDigitInput.value = '';
    pointsInput.value = '';
  });

  // ✅ Submit button click
  submitBtn.addEventListener("click", async () => {
    if (bidRegistry.length === 0) return showMessage("Add at least one bid ❌", "error");

    try {
      const res = await fetch("/dp-motor/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: main.dataset.gameId,
          gameName: main.dataset.gameName,
          bets: bidRegistry
        })
      });

      const data = await res.json();
      if (data.success) {
        showMessage(data.message, "success");
        bidRegistry = [];
        refreshBottomBar();
      } else showMessage(data.message, "error");
    } catch {
      showMessage("Server error ❌", "error");
    }
  });

  // ❌ Close button click
  if (closeBtn) closeBtn.onclick = () => {
    bidRegistry = [];
    refreshBottomBar();
    main.classList.add("hidden");
  };
});
