document.addEventListener("DOMContentLoaded", () => {

  /* ================= DP MOTOR MAP ================= */
  const DP_MOTOR_MAP = {
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
  const main = document.getElementById("dPMotor ");
  const closeBtn = document.getElementById("closeDPMotor ");
  const mainDigitInput = document.getElementById("dpmotor_opendigit");
  const pointsInput = document.getElementById("dpmotor_points");
  const addBtn = document.getElementById("dpmotor_addbtn");
  const submitBtn = document.getElementById("dpmotor_submitbtn");
  const tableBody = document.getElementById("dpTable");

  const sessionRadios = main.querySelectorAll("input[name='dpmotor_session']");
  const totalBidsEl = main.querySelector(".dpmotor_totalbids");
  const totalAmountEl = main.querySelector(".dpmotor_totalamount");

  let rows = []; 
  let serverTime = null;
  let openLocked = false;

  /* ================= SINGLE DIGIT LOCK ================= */
  mainDigitInput.addEventListener("input", () => {
    mainDigitInput.value = mainDigitInput.value.replace(/[^0-9]/g, "").slice(0,1);
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

  function checkOpenLock() {
    const openTime = main.dataset.openTime;
    if (!serverTime || !openTime || openLocked) return;

    if (serverTime >= openTime) {
      openLocked = true;
      showMessage("Open session closed ❌","error");

      sessionRadios.forEach(r => {
        if (r.value === "OPEN") r.disabled = true;
      });

      document.querySelector("input[value='CLOSE']").checked = true;
    }
  }

  syncServerTime().then(checkOpenLock);
  setInterval(async ()=>{
    await syncServerTime();
    checkOpenLock();
  },5000);

  /* ================= UI ================= */
  function refreshTable() {
    tableBody.innerHTML="";
    let total=0;

    rows.forEach((r,i)=>{
      total+=r.amount;
      tableBody.innerHTML+=`
        <tr>
          <td>${r.digit}</td>
          <td>${r.amount}</td>
          <td>${r.session}</td>
          <td><i class="fa-solid fa-trash text-red-600 cursor-pointer" data-i="${i}"></i></td>
        </tr>`;
    });

    totalBidsEl.innerText = rows.length;
    totalAmountEl.innerText = total;
  }

  tableBody.onclick = e=>{
    if(e.target.dataset.i !== undefined){
      rows.splice(e.target.dataset.i,1);
      refreshTable();
    }
  };

  /* ================= ADD ================= */
  addBtn.onclick = () => {
    const session = document.querySelector("input[name='dpmotor_session']:checked").value;
    const mainNo = Number(mainDigitInput.value);
    const points = Number(pointsInput.value);

    if (session === "OPEN" && openLocked)
      return showMessage("Open session closed ❌","error");

    if (mainNo < 0 || mainNo > 9 || points <= 0)
      return showMessage("Invalid input ❌","error");

    const underNos = DP_MOTOR_MAP[mainNo];

    // ✅ CORRECT CHECK: mainNo + session
    const existing = rows.filter(
      r => r.session === session && r.mainNo === mainNo
    );

    if (existing.length) {
      existing.forEach(r => r.amount += points);
    } else {
      underNos.forEach(d => {
        rows.push({
          digit: d,
          amount: points,
          session,
          mainNo   // 🔥 IMPORTANT
        });
      });
    }

    refreshTable();
    mainDigitInput.value="";
    pointsInput.value="";
  };

  /* ================= SUBMIT ================= */
  submitBtn.onclick = async () => {
    if (!rows.length) return showMessage("No bets ❌","error");

    if (openLocked && rows.some(r=>r.session==="OPEN"))
      return showMessage("Open session closed ❌","error");

    const grouped = {};
    rows.forEach(r=>{
      const key = r.session + r.mainNo;
      if(!grouped[key]){
        grouped[key]={
          session: r.session,
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

    const res = await fetch("/dp-motor/place-bet",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        gameId: main.dataset.gameId,
        gameName: main.dataset.gameName,
        bets
      })
    });

    const data = await res.json();
    showMessage(data.message, data.success?"success":"error");

    if(data.success){
      rows=[];
      refreshTable();
    }
  };

  closeBtn.onclick = ()=>{
    rows=[];
    refreshTable();
    main.classList.add("hidden");
  };

});