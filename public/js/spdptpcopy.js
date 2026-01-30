// document.addEventListener("DOMContentLoaded", () => {

//   /* ================= NUMBER MAPS ================= */
//   const SP_MAP = {
//     0:["127","136","145","190","235","280","370","389","460","479","569","578"],
//     1:["128","137","146","236","245","290","380","470","489","560","678","579"],
//     2:["129","138","147","156","237","246","345","390","480","570","679","589"],
//     3:["120","139","148","157","238","247","256","346","490","580","670","689"],
//     4:["130","149","158","167","239","248","257","347","356","590","680","789"],
//     5:["140","159","168","230","249","258","267","348","357","456","690","780"],
//     6:["123","150","169","178","240","259","268","349","358","457","367","790"],
//     7:["124","160","179","250","269","278","340","359","368","458","467","890"],
//     8:["125","134","170","189","260","279","350","369","378","459","567","468"],
//     9:["126","135","180","234","270","289","360","379","450","469","478","568"]
//   };

//   const DP_MAP = {
//     0:["550","668","244","299","226","488","677","118","334"],
//     1:["100","119","155","227","335","344","399","588","669"],
//     2:["200","110","228","255","336","499","660","688","778"],
//     3:["300","166","229","337","355","445","599","779","788"],
//     4:["400","112","220","266","338","446","455","699","770"],
//     5:["500","113","122","177","339","366","447","799","889"],
//     6:["600","114","277","330","448","466","556","880","899"],
//     7:["700","115","133","188","223","377","449","557","566"],
//     8:["800","116","224","233","288","440","477","558","990"],
//     9:["900","117","144","199","225","388","559","577","667"]
//   };

//   /* ================= ELEMENTS ================= */
//   const main = document.getElementById("sPDPTP ");
//   const closeBtn = document.getElementById("closeSPDPTP");

//   const openDigitInput = document.getElementById("spdptpopen_Digit");
//   const pointsInput = document.getElementById("spdptp_Points");

//   const spCheckbox = document.getElementById("SP");
//   const dpCheckbox = document.getElementById("DP");
//   const tpCheckbox = document.getElementById("TP");

//   const addBtn = document.getElementById("spdptpAddBtn");
//   const submitBtn = document.getElementById("spdptp_submitbtn");

//   const bidsEls = main.querySelectorAll(".spdptp_totalbids");
//   const tableBody = document.getElementById("spdptpTable");

//   let betsRegistry = [];

//   /* ================= MESSAGE ================= */
//   function showMessage(msg, type = "success") {
//     const box = document.createElement("div");
//     box.innerText = msg;
//     box.style.cssText = `
//       position:fixed;top:20px;left:50%;transform:translateX(-50%);
//       padding:12px 26px;border-radius:14px;
//       background:${type === "success" ? "#16a34a" : "#dc2626"};
//       color:#fff;font-weight:700;z-index:9999
//     `;
//     document.body.appendChild(box);
//     setTimeout(() => box.remove(), 3000);
//   }

//   /* ================= UI ================= */
//   function refreshUI() {
//     tableBody.innerHTML = "";
//     let totalAmount = 0;

//     betsRegistry.forEach((b, i) => {
//       totalAmount += b.points;
//       tableBody.innerHTML += `
//         <tr class="border-b text-center">
//           <td>${b.digit}</td>
//           <td>${b.choose}</td>
//           <td>${b.points}</td>
//           <td>${b.session}</td>
//           <td>
//             <i class="fa-solid fa-trash text-red-600 cursor-pointer"
//               data-index="${i}"></i>
//           </td>
//         </tr>`;
//     });

//     bidsEls[0].innerText = betsRegistry.length;
//     bidsEls[1].innerText = totalAmount;
//   }

//   /* ================= DELETE ================= */
//   tableBody.addEventListener("click", e => {
//     if (e.target.classList.contains("fa-trash")) {
//       betsRegistry.splice(e.target.dataset.index, 1);
//       refreshUI();
//     }
//   });

//   /* ================= ADD ================= */
//   addBtn.addEventListener("click", () => {

//     const session = main.querySelector(
//       'input[name="SPDPTP_session"]:checked'
//     )?.nextElementSibling.innerText;

//     const choose = [];
//     if (spCheckbox.checked) choose.push("SP");
//     if (dpCheckbox.checked) choose.push("DP");
//     if (tpCheckbox.checked) choose.push("TP");

//     const openDigit = Number(openDigitInput.value);
//     const points = Number(pointsInput.value);

//     if (
//       choose.length === 0 ||
//       !Number.isInteger(openDigit) ||
//       openDigit < 0 || openDigit > 9 ||
//       points <= 0
//     ) {
//       return showMessage("Invalid input ❌", "error");
//     }

//     /* 🔥 CORE FIX — PER TYPE ENTRY */
//     choose.forEach(type => {

//       let numbers = [];
//       if (type === "SP") numbers = SP_MAP[openDigit];
//       if (type === "DP") numbers = DP_MAP[openDigit];
//       if (type === "TP") numbers = [`${openDigit}${openDigit}${openDigit}`];

//       numbers.forEach(num => {
//         const existing = betsRegistry.find(
//           b => b.digit === num && b.session === session && b.choose === type
//         );

//         if (existing) {
//           existing.points += points;
//         } else {
//           betsRegistry.push({
//             digit: num,
//             choose: type,   // ✅ ONLY SP / DP / TP
//             session,
//             points
//           });
//         }
//       });

//     });

//     showMessage("Bid added ✅");
//     refreshUI();

//     openDigitInput.value = "";
//     pointsInput.value = "";
//   });

//   /* ================= SUBMIT ================= */
//   submitBtn.addEventListener("click", async () => {
//     if (!betsRegistry.length)
//       return showMessage("No bets ❌", "error");

//     const res = await fetch("/spdptp/place-bet", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         gameId: main.dataset.gameId,
//         gameName: main.dataset.gameName,
//         bets: betsRegistry,
//       }),
//     });

//     const data = await res.json();
//     if (data.success) {
//       showMessage("Bet placed ✅");
//       betsRegistry = [];
//       refreshUI();
//     } else {
//       showMessage(data.message || "Failed ❌", "error");
//     }
//   });

//   /* ================= CLOSE ================= */
//   closeBtn.onclick = () => {
//     betsRegistry = [];
//     refreshUI();
//     main.classList.add("hidden");
//   };

// });

document.addEventListener("DOMContentLoaded", () => {

  /* ================= NUMBER MAPS ================= */
  const SP_MAP = {
    0:["127","136","145","190","235","280","370","389","460","479","569","578"],
    1:["128","137","146","236","245","290","380","470","489","560","678","579"],
    2:["129","138","147","156","237","246","345","390","480","570","679","589"],
    3:["120","139","148","157","238","247","256","346","490","580","670","689"],
    4:["130","149","158","167","239","248","257","347","356","590","680","789"],
    5:["140","159","168","230","249","258","267","348","357","456","690","780"],
    6:["123","150","169","178","240","259","268","349","358","457","367","790"],
    7:["124","160","179","250","269","278","340","359","368","458","467","890"],
    8:["125","134","170","189","260","279","350","369","378","459","567","468"],
    9:["126","135","180","234","270","289","360","379","450","469","478","568"]
  };

  const DP_MAP = {
    0:["550","668","244","299","226","488","677","118","334"],
    1:["100","119","155","227","335","344","399","588","669"],
    2:["200","110","228","255","336","499","660","688","778"],
    3:["300","166","229","337","355","445","599","779","788"],
    4:["400","112","220","266","338","446","455","699","770"],
    5:["500","113","122","177","339","366","447","799","889"],
    6:["600","114","277","330","448","466","556","880","899"],
    7:["700","115","133","188","223","377","449","557","566"],
    8:["800","116","224","233","288","440","477","558","990"],
    9:["900","117","144","199","225","388","559","577","667"]
  };

  /* ================= ELEMENTS ================= */
  const main = document.getElementById("sPDPTP ");
  const closeBtn = document.getElementById("closeSPDPTP");

  const openDigitInput = document.getElementById("spdptpopen_Digit");
  const pointsInput = document.getElementById("spdptp_Points");

  const spCheckbox = document.getElementById("SP");
  const dpCheckbox = document.getElementById("DP");
  const tpCheckbox = document.getElementById("TP");

  const addBtn = document.getElementById("spdptpAddBtn");
  const submitBtn = document.getElementById("spdptp_submitbtn");

  const bidsEls = main.querySelectorAll(".spdptp_totalbids");
  const tableBody = document.getElementById("spdptpTable");
  const sessionRadios = main.querySelectorAll('input[name="SPDPTP_session"]');

  let betsRegistry = [];
  let serverTime = null;
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

  /* ================= SERVER TIME (OPEN LOCK) ================= */
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

      sessionRadios.forEach(r => {
        if (r.nextElementSibling.innerText === "Open") r.disabled = true;
      });

      const checked = main.querySelector(
        'input[name="SPDPTP_session"]:checked'
      );

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

  /* ================= GROUP BETS ================= */
function groupBets(bets) {
  const grouped = {};

  bets.forEach(b => {
    const key = `${b.session}-${b.choose}-${b.digit}`;
    if (!grouped[key]) {
      grouped[key] = {
        session: b.session,
        type: b.choose,
        mainNo: Number(b.digit[0]),
        underNos: [b.digit],
        points: b.points
      };
    } else {
      grouped[key].underNos.push(b.digit);
      grouped[key].points += b.points;
    }
  });

  return Object.values(grouped).map(b => ({
    session: b.session,
    type: b.type,
    mainNo: b.mainNo,
    underNo: b.underNos.join(","), // for UI
    points: b.points
  }));
}


  /* ================= UI ================= */
  function refreshUI() {
    tableBody.innerHTML = "";
    let totalAmount = 0;

    const displayBets = groupBets(betsRegistry);

    displayBets.forEach((b, i) => {
      totalAmount += b.points;
      tableBody.innerHTML += `
        <tr class="border-b text-center">
          <td>${b.underNo}</td>
          <td>${b.type}</td>
          <td>${b.points}</td>
          <td>${b.session}</td>
          <td>
            <i class="fa-solid fa-trash text-red-600 cursor-pointer" data-index="${i}"></i>
          </td>
        </tr>`;
    });

    bidsEls[0].innerText = displayBets.length;
    bidsEls[1].innerText = totalAmount;
  }

  /* ================= DELETE ================= */
  tableBody.addEventListener("click", e => {
    if (e.target.classList.contains("fa-trash")) {
      betsRegistry.splice(e.target.dataset.index, 1);
      refreshUI();
    }
  });

  /* ================= ADD ================= */
  addBtn.addEventListener("click", () => {

    const session = main.querySelector(
      'input[name="SPDPTP_session"]:checked'
    )?.nextElementSibling.innerText;

    if (session === "Open" && openLocked) {
      return showMessage("Open session closed ❌", "error");
    }

    const choose = [];
    if (spCheckbox.checked) choose.push("SP");
    if (dpCheckbox.checked) choose.push("DP");
    if (tpCheckbox.checked) choose.push("TP");

    const openDigit = Number(openDigitInput.value);
    const points = Number(pointsInput.value);

    if (
      choose.length === 0 ||
      !Number.isInteger(openDigit) ||
      openDigit < 0 || openDigit > 9 ||
      points <= 0
    ) {
      return showMessage("Invalid input ❌", "error");
    }

    choose.forEach(type => {
      let numbers = [];
      if (type === "SP") numbers = SP_MAP[openDigit];
      if (type === "DP") numbers = DP_MAP[openDigit];
      if (type === "TP") numbers = [`${openDigit}${openDigit}${openDigit}`];

      numbers.forEach(num => {
        const existing = betsRegistry.find(
          b => b.digit === num && b.session === session && b.choose === type
        );

        if (existing) {
          existing.points += points;
        } else {
          betsRegistry.push({
            digit: num,
            choose: type,
            session,
            points
          });
        }
      });
    });

    showMessage("Bid added ✅");
    refreshUI();

    openDigitInput.value = "";
    pointsInput.value = "";
  });

  /* ================= SUBMIT ================= */
  submitBtn.addEventListener("click", async () => {
    if (!betsRegistry.length)
      return showMessage("No bets ❌", "error");

    const groupedBets = groupBets(betsRegistry);

    const res = await fetch("/spdptp/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: main.dataset.gameId,
        gameName: main.dataset.gameName,
        bets: groupedBets,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showMessage("Bet placed ✅");
      betsRegistry = [];
      refreshUI();
    } else {
      showMessage(data.message || "Failed ❌", "error");
    }
  });

  /* ================= CLOSE ================= */
  closeBtn.onclick = () => {
    betsRegistry = [];
    refreshUI();
    main.classList.add("hidden");
  };

});
