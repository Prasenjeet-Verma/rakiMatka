document.addEventListener("DOMContentLoaded", () => {

  /* ================= DP MOTOR MAP ================= */
  const DP_MOTOR_MAP = {
    0: ["127","136","145","190","235","280","370","389","460","479","569","578"],
    1: ["128","137","146","236","245","290","380","470","489","560","678","579"],
    2: ["129","138","147","156","237","246","345","390","480","570","679","589"],
    3: ["120","139","148","157","238","247","256","346","490","580","670","689"],
    4: ["130","149","158","167","239","248","257","347","356","590","680","789"],
    5: ["140","159","168","230","249","258","267","348","357","456","690","780"],
    6: ["123","150","169","178","240","259","268","349","358","457","367","790"],
    7: ["124","160","179","250","269","278","340","359","368","458","467","890"],
    8: ["125","134","170","189","260","279","350","369","378","459","567","468"],
    9: ["126","135","180","234","270","289","360","379","450","469","478","568"],
  };

/* ================= ELEMENTS ================= */
const main = document.getElementById("sPMotor ");
const closeBtn = document.getElementById("closeSPMotor ");

const mainDigitInput = document.getElementById("spmotor_opendigit");
const pointsInput = document.getElementById("spmotor_points");
const addBtn = document.getElementById("spmotor_addbtn");
const submitBtn = document.getElementById("spmotor_submitbtn");

const tableBody = document.getElementById("spTable");

const sessionRadios = main.querySelectorAll(
  "input[name='spmotor_session']"
);

const totalBidsEl = main.querySelector(".spmotor_totalbids");
const totalAmountEl = main.querySelector(".spmotor_totalamount");

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
    const session = document.querySelector("input[name='spmotor_session']:checked").value;
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

    const res = await fetch("/sp-motor/place-bet",{
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