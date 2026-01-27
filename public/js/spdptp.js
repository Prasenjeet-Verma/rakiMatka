document.addEventListener("DOMContentLoaded", () => {
  /* ================= MAIN ELEMENTS ================= */
  const main = document.getElementById("sPDPTP ");
  const closeBtn = document.getElementById("closeSPDPTP");

  const sessionRadios = main.querySelectorAll('input[name="SPDPTP_session"]');
  const openDigitInput = document.getElementById("spdptpopen_Digit");
  const pointsInput = document.getElementById("spdptp_Points");

  const spCheckbox = document.getElementById("SP");
  const dpCheckbox = document.getElementById("DP");
  const tpCheckbox = document.getElementById("TP");

  const addBtn = document.getElementById("spdptpAddBtn");
  const submitBtn = document.getElementById("spdptp_submitbtn");

  const bidsEls = main.querySelectorAll(".spdptp_totalbids");

  let betsRegistry = [];
  let serverTime = null;
  let openLocked = false;

  /* ================= SERVER TIME ================= */
  async function syncServerTime() {
    try {
      const res = await fetch("/server-time");
      const data = await res.json();
      if (data.success) serverTime = data.time;
    } catch {
      console.error("Server time fetch failed");
    }
  }

  function checkOpenSessionLock() {
    const openTime = main.dataset.openTime;
    if (!serverTime || !openTime || openLocked) return;

    if (serverTime >= openTime) {
      openLocked = true;
      showMessage("Open session closed ❌", "error");

      sessionRadios.forEach(r => {
        if (r.nextElementSibling.innerText === "Open") r.disabled = true;
      });

      const checked = main.querySelector('input[name="SPDPTP_session"]:checked');
      if (checked && checked.nextElementSibling.innerText === "Open") {
        sessionRadios.forEach(r => {
          if (r.nextElementSibling.innerText === "Close") r.checked = true;
        });
      }
    }
  }

  syncServerTime().then(checkOpenSessionLock);
  setInterval(async () => {
    await syncServerTime();
    checkOpenSessionLock();
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

  /* ================= FOOTER UPDATE ================= */
  function refreshFooter() {
    const totalAmount = betsRegistry.reduce((sum, b) => sum + b.points, 0);
    bidsEls[0].innerText = betsRegistry.length; // bids
    bidsEls[1].innerText = totalAmount;         // amount
  }

  /* ================= ADD BUTTON ================= */
  addBtn.addEventListener("click", () => {
    const session = main.querySelector(
      'input[name="SPDPTP_session"]:checked'
    )?.nextElementSibling.innerText;

    if (!session) return showMessage("Select session ❌", "error");
    if (session === "Open" && openLocked)
      return showMessage("Open session closed ❌", "error");

    const choose = [];
    if (spCheckbox.checked) choose.push("SP");
    if (dpCheckbox.checked) choose.push("DP");
    if (tpCheckbox.checked) choose.push("TP");

    if (choose.length === 0)
      return showMessage("Select SP / DP / TP ❌", "error");

    const openDigit = Number(openDigitInput.value);
    const points = Number(pointsInput.value);
    
if (
  isNaN(openDigit) ||
  openDigit < 0 ||        // negative not allowed
  isNaN(points) ||
  points <= 0
)
  return showMessage("Invalid digit or points ❌", "error");


    betsRegistry.push({
      session,
      choose,
      openDigit,
      points,
    });

    showMessage("Bid added ✅");
    refreshFooter();

    openDigitInput.value = "";
    pointsInput.value = "";
    spCheckbox.checked = dpCheckbox.checked = tpCheckbox.checked = false;
  });

  /* ================= SUBMIT BUTTON ================= */
  submitBtn.addEventListener("click", async () => {
    if (betsRegistry.length === 0)
      return showMessage("Add at least one bid ❌", "error");

    try {
      const res = await fetch("/spdptp/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: main.dataset.gameId,
          gameName: main.dataset.gameName,
          bets: betsRegistry,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showMessage(data.message || "Bet placed successfully ✅");
        betsRegistry = [];
        refreshFooter();
      } else {
        showMessage(data.message || "Bet failed ❌", "error");
      }
    } catch {
      showMessage("Server error ❌", "error");
    }
  });

  /* ================= CLOSE ================= */
  if (closeBtn) {
    closeBtn.onclick = () => {
      betsRegistry = [];
      refreshFooter();
      main.classList.add("hidden");
    };
  }
});
