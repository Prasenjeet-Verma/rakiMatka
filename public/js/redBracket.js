const bidTableBody = document.getElementById("bidTableBody");
const inputPoints = document.getElementById("inputPoints");
const modeHalf = document.getElementById("modeHalf");
const modeFull = document.getElementById("modeFull");
const totalBidCount = document.getElementById("totalBidCount");
const totalPointsSum = document.getElementById("totalPointsSum");
const btnAddBid = document.getElementById("btnAddBid");

let bidEntries = [];

function renderTable() {
  if (bidEntries.length === 0) {
    bidTableBody.innerHTML =
      '<div class="p-10 text-center text-slate-400 italic text-sm">No active bids</div>';
    totalBidCount.innerText = "0";
    totalPointsSum.innerText = "0";
    return;
  }

  bidTableBody.innerHTML = "";
  let sum = 0;

  bidEntries.forEach((bid, i) => {
    sum += parseInt(bid.amount);
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-4 items-center p-4 text-center hover:bg-emerald-50/40 transition-colors";
    row.innerHTML = `
                    <span class="font-bold text-lg text-slate-700">${bid.digit}</span>
                    <span class="text-slate-500 font-semibold">${bid.amount}</span>
                    <div class="flex items-center justify-center">
                        <span class="w-4 h-4 rounded-full border border-slate-300"></span>
                    </div>
                    <div class="flex items-center justify-center">
                        <button onclick="removeEntry(${i})" class="text-rose-400 hover:text-rose-600 transition-all p-2">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
    bidTableBody.appendChild(row);
  });

  totalBidCount.innerText = bidEntries.length;
  totalPointsSum.innerText = sum;
}

function generateData(type) {
  const points = inputPoints.value || 0;
  let digits = [];

  if (type === "half") {
    // Digits from your image: 05, 16, 27, 38, 49, 50, 61, 72, 83, 94
    digits = ["05", "16", "27", "38", "49", "50", "61", "72", "83", "94"];
  } else {
    // Digits from your image: 00, 11, 22, 33, 44, 55, 66, 77, 88, 99
    digits = ["00", "11", "22", "33", "44", "55", "66", "77", "88", "99"];
  }

  bidEntries = digits.map((d) => ({ digit: d, amount: points }));
  renderTable();
}

function removeEntry(index) {
  bidEntries.splice(index, 1);
  renderTable();
}

// Logic triggers
modeHalf.addEventListener("change", () => generateData("half"));
modeFull.addEventListener("change", () => generateData("full"));

btnAddBid.addEventListener("click", () => {
  if (modeHalf.checked) generateData("half");
  else generateData("full");
});
