document.addEventListener("DOMContentLoaded", () => {

  const gameBox = document.getElementById("leftDigitGame");
  const openBtn = document.getElementById("btnJodiDigitBulk");
  const closeBtn = document.getElementById("closeJodiDigitBulk");

  const openInput = document.getElementById("leftDigit_openDigit");
  const pointsInput = document.getElementById("leftDigit_points");
  const addBtn = document.getElementById("leftDigit_addBtn");
  const submitBtn = document.getElementById("leftDigit_submitBtn");

  const tableBody = document.getElementById("leftDigitLiveBets");
  const totalBidsEl = document.getElementById("leftDigit_totalBids");
  const totalAmountEl = document.getElementById("leftDigit_totalAmount");

  let bets = [];
  let serverTime = null;
  let gameClosed = false;

  /* ========== OPEN / CLOSE ========== */
  openBtn.onclick = () => gameBox.classList.remove("hidden");
  closeBtn.onclick = () => gameBox.classList.add("hidden");

  /* ========== 1 DIGIT ONLY ========== */
  openInput.addEventListener("input", () => {
    let v = openInput.value.replace(/[^0-9]/g, "");
    if (v.length > 1) v = v[0];
    openInput.value = v;
  });

  /* ========== MESSAGE ========== */
  function showMessage(msg, type="success") {
    const box = document.createElement("div");
    box.innerText = msg;
    box.style.cssText = `
      position:fixed;top:20px;left:50%;
      transform:translateX(-50%);
      padding:12px 26px;border-radius:12px;
      background:${type==="success"?"#16a34a":"#dc2626"};
      color:#fff;font-weight:700;z-index:9999`;
    document.body.appendChild(box);
    setTimeout(()=>box.remove(),3000);
  }

  /* ========== REFRESH TABLE ========== */
  function refreshTable() {
    tableBody.innerHTML = "";
    let totalAmount = 0;

    bets.forEach((b,i) => {
      totalAmount += b.amount;
      tableBody.innerHTML += `
        <tr>
          <td>${b.openDigit}</td>
          <td>${b.amount}</td>
          <td>
            <i class="fa-solid fa-trash text-red-600 cursor-pointer" data-i="${i}"></i>
          </td>
        </tr>`;
    });

    totalBidsEl.innerText = bets.length;
    totalAmountEl.innerText = totalAmount;
  }

  tableBody.onclick = e => {
    if (e.target.dataset.i !== undefined) {
      bets.splice(e.target.dataset.i,1);
      refreshTable();
    }
  };

  /* ========== ADD BET ========== */
  addBtn.onclick = () => {
    if (gameClosed) return showMessage("Game Closed ❌","error");

    const digit = openInput.value;
    const points = Number(pointsInput.value);

    if (!digit) return showMessage("Enter digit 0-9 ❌","error");
    if (!points || points <= 0) return showMessage("Enter valid points ❌","error");

    const existing = bets.find(b => b.openDigit === digit);
    if (existing) {
      existing.amount += points;
    } else {
      bets.push({ openDigit: digit, amount: points });
    }

    openInput.value = "";
    pointsInput.value = "";
    refreshTable();
  };

  /* ========== SERVER TIME CLOSE ========== */
  async function syncServerTime() {
    try {
      const r = await fetch("/server-time");
      const d = await r.json();
      if (d.success) serverTime = d.time;
    } catch {}
  }

  function checkClose() {
    const openTime = gameBox.dataset.openTime;
    if (!serverTime || !openTime || gameClosed) return;
    if (serverTime >= openTime) {
      gameClosed = true;
      showMessage("Game Closed ❌","error");
      openInput.disabled = true;
      pointsInput.disabled = true;
      addBtn.disabled = true;
      submitBtn.disabled = true;
    }
  }

  syncServerTime().then(checkClose);
  setInterval(async () => {
    await syncServerTime();
    checkClose();
  }, 5000);

  /* ========== SUBMIT ========== */
  submitBtn.onclick = async () => {
    if (!bets.length) return showMessage("No bets ❌","error");
    if (gameClosed) return showMessage("Game Closed ❌","error");

    const res = await fetch("/left-digit/place-bet", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        gameId: gameBox.dataset.gameId,
        gameName: gameBox.dataset.gameName,
        bets
      })
    });

    const data = await res.json();
    showMessage(data.message, data.success?"success":"error");

    if (data.success) {
      bets = [];
      refreshTable();
    }
  };

});