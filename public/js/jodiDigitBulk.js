document.addEventListener("DOMContentLoaded", () => {

  /* ================= JODI DIGIT MAP ================= */
  const jodiDigitBulkMap = {
    0: ["00","01","02","03","04","05","06","07","08","09"],
    1: ["10","11","12","13","14","15","16","17","18","19"],
    2: ["20","21","22","23","24","25","26","27","28","29"],
    3: ["30","31","32","33","34","35","36","37","38","39"],
    4: ["40","41","42","43","44","45","46","47","48","49"],
    5: ["50","51","52","53","54","55","56","57","58","59"],
    6: ["60","61","62","63","64","65","66","67","68","69"],
    7: ["70","71","72","73","74","75","76","77","78","79"],
    8: ["80","81","82","83","84","85","86","87","88","89"],
    9: ["90","91","92","93","94","95","96","97","98","99"],
  };

  /* ================= ELEMENTS ================= */
  const main = document.getElementById("jodiDigitBulk");
  const closeBtn = document.getElementById("closeJodiDigitBulk");
  const mainDigitInput = document.getElementById("jodiDigitBulk_opendigit");
  const pointsInput = document.getElementById("jodiDigitBulk_points");
  const addBtn = document.getElementById("jodiDigitBulk_addbtn");
  const submitBtn = document.getElementById("jodiDigitBulk_submitbtn");
  const tableBody = document.getElementById("jodiDigitBulkTable");
  const totalBidsEl = main.querySelector(".jodiDigitBulk_totalbids");
  const totalAmountEl = main.querySelector(".jodiDigitBulk_totalamount");

  let rows = []; // each row: { mainNo, digit, amount }
  let serverTime = null;
  let gameClosed = false;

  /* ================= INPUT FILTER ================= */
  mainDigitInput.addEventListener("input", () => {
    mainDigitInput.value = mainDigitInput.value
      .replace(/[^0-9,]/g, "")
      .replace(/,+/g, ",")
      .replace(/^,|,$/g, "");
  });

  /* ================= MESSAGE ================= */
  function showMessage(msg, type="success") {
    const box = document.createElement("div");
    box.innerText = msg;
    box.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      padding:12px 26px;border-radius:14px;
      background:${type==="success"?"#16a34a":"#dc2626"};
      color:#fff;font-weight:700;z-index:9999`;
    document.body.appendChild(box);
    setTimeout(()=>box.remove(),3000);
  }

  /* ================= SERVER TIME ================= */
  async function syncServerTime() {
    try {
      const res = await fetch("/server-time");
      const data = await res.json();
      if (data.success) serverTime = data.time;
    } catch {}
  }

  function checkGameClose() {
    const openTime = main.dataset.openTime;
    if (!serverTime || !openTime || gameClosed) return;
    if (serverTime >= openTime) {
      gameClosed = true;
      showMessage("Game Closed ❌","error");
      addBtn.disabled = true;
      submitBtn.disabled = true;
      mainDigitInput.disabled = true;
      pointsInput.disabled = true;
    }
  }

  syncServerTime().then(checkGameClose);
  setInterval(async () => {
    await syncServerTime();
    checkGameClose();
  }, 5000);

  /* ================= TABLE ================= */
  function refreshTable() {
    tableBody.innerHTML = "";
    let total = 0;
    rows.forEach((r,i) => {
      total += r.amount;
      tableBody.innerHTML += `
        <tr>
          <td>${r.digit}</td>
          <td>${r.amount}</td>
          <td><i class="fa-solid fa-trash text-red-600 cursor-pointer" data-i="${i}"></i></td>
        </tr>`;
    });
    totalBidsEl.innerText = rows.length;
    totalAmountEl.innerText = total;
  }

  tableBody.onclick = e => {
    if (e.target.dataset.i !== undefined) {
      rows.splice(e.target.dataset.i,1);
      refreshTable();
    }
  };

  /* ================= ADD ================= */
  addBtn.onclick = () => {
    if (gameClosed) return showMessage("Game Closed ❌","error");

    const points = Number(pointsInput.value);
    if (points <= 0) return showMessage("Invalid points ❌","error");

    const raw = mainDigitInput.value.trim();
    let mainNos = raw.includes(",") ? raw.split(",").map(Number) : raw.split("").map(Number);
    mainNos = [...new Set(mainNos)].filter(n => n >=0 && n <=9);
    if (!mainNos.length) return showMessage("Invalid digit ❌","error");

    mainNos.forEach(mainNo => {
      const underNos = jodiDigitBulkMap[mainNo];

      underNos.forEach(digit => {
        // check if same mainNo+digit already exists
        const existing = rows.find(r => r.mainNo === mainNo && r.digit === digit);
        if (existing) {
          existing.amount += points;
        } else {
          rows.push({
            mainNo,
            digit,
            amount: points
          });
        }
      });
    });

    refreshTable();
    mainDigitInput.value = "";
    pointsInput.value = "";
  };

  /* ================= SUBMIT ================= */
  submitBtn.onclick = async () => {
    if (gameClosed) return showMessage("Game Closed ❌","error");
    if (!rows.length) return showMessage("No bets ❌","error");

    // group by mainNo
    const grouped = {};
    rows.forEach(r => {
      const key = r.mainNo;
      if (!grouped[key]) {
        grouped[key] = {
          mainNo: r.mainNo,
          underNos: [],
          perUnderNosPoints: r.amount,
          totalPoints: 0
        };
      }
      grouped[key].underNos.push(r.digit);
      grouped[key].totalPoints += r.amount;
    });

    const bets = Object.values(grouped);

    const res = await fetch("/jodi-digit-bulk/place-bet", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        gameId: main.dataset.gameId,
        gameName: main.dataset.gameName,
        bets
      })
    });

    const data = await res.json();
    showMessage(data.message, data.success?"success":"error");

    if (data.success) {
      rows = [];
      refreshTable();
    }
  };

  /* ================= CLOSE ================= */
  closeBtn.onclick = () => {
    rows = [];
    refreshTable();
    main.classList.add("hidden");
  };

});