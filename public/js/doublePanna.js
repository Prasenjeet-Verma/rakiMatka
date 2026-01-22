const g_data_store = {
  0: ["550", "668", "244", "299", "226", "488", "677", "118", "334"],
  1: ["100", "119", "155", "227", "335", "344", "399", "588", "669"],
  2: ["200", "110", "228", "255", "336", "499", "660", "688", "778"],
  3: ["300", "166", "229", "337", "355", "445", "599", "779", "788"],
  4: ["400", "112", "220", "266", "338", "446", "455", "699", "770"],
  5: ["500", "113", "122", "177", "339", "366", "447", "799", "889"],
  6: ["600", "114", "277", "330", "448", "466", "556", "880", "899"],
  7: ["700", "115", "133", "188", "223", "377", "449", "557", "566"],
  8: ["800", "116", "224", "233", "288", "440", "477", "558", "990"],
  9: ["900", "117", "144", "199", "225", "388", "559", "577", "667"],
};

let g_ledger = {};
let g_active_digit = "0";
let g_active_mode = "OPEN";

function updateGameMode(val) {
  g_active_mode = val;
  buildGrid(g_active_digit);
}

function buildTabs() {
  const wrap = document.getElementById("g-tab-wrapper");
  wrap.innerHTML = "";
  for (let i = 0; i <= 9; i++) {
    const tab = document.createElement("button");
    tab.innerText = i;
    const isSelected = g_active_digit == i;

    tab.className = `min-w-[40px] md:min-w-[48px] h-10 md:h-12 rounded-full border-2 flex items-center justify-center font-black text-sm md:text-base transition-all duration-300
                    ${isSelected ? "g-bg-teal text-white g-border-teal shadow-lg scale-110" : "bg-white text-slate-400 border-slate-100 hover:border-teal-200"}`;

    tab.onclick = () => {
      g_active_digit = i.toString();
      buildTabs();
      buildGrid(g_active_digit);
    };
    wrap.appendChild(tab);
  }
}

function buildGrid(digit) {
  const grid = document.getElementById("g-main-grid");
  grid.innerHTML = "";
  const items = g_data_store[digit] || [];

  items.forEach((code) => {
    const key = `${g_active_mode}-${code}`;
    const val = g_ledger[key] || "";

    const box = document.createElement("div");
    box.className =
      "flex border-2 border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:g-border-teal transition-all group";
    box.innerHTML = `
                    <div class="g-bg-teal text-white w-[42%] flex items-center justify-center font-black py-3 sm:py-4 italic text-sm md:text-lg group-hover:bg-[#004a3d] transition-colors">${code}</div>
                    <input type="number" 
                           inputmode="numeric"
                           placeholder="0" 
                           value="${val}"
                           class="w-[58%] px-4 outline-none text-sm md:text-base font-bold text-slate-700 g-input-field placeholder:text-slate-200" 
                           oninput="processInput('${code}', this.value)">
                `;
    grid.appendChild(box);
  });
}

function processInput(code, value) {
  const key = `${g_active_mode}-${code}`;
  if (value === "" || parseInt(value) <= 0) {
    delete g_ledger[key];
  } else {
    g_ledger[key] = parseInt(value);
  }
  refreshTotal();
}

function refreshTotal() {
  let sum = 0;
  for (let entry in g_ledger) {
    sum += g_ledger[entry];
  }
  document.getElementById("g-total-display").innerText =
    sum.toLocaleString("en-IN");
}

// Initialize App
buildTabs();
buildGrid(g_active_digit);
