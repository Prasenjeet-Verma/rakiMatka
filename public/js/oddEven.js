const bidDisplayArea = document.getElementById("bidDisplayArea");
const inputPointsAmount = document.getElementById("inputPointsAmount");
const radioPatternOdd = document.getElementById("radioPatternOdd");
const radioPatternEven = document.getElementById("radioPatternEven");
const selectGameTiming = document.getElementById("selectGameTiming");
const displayTotalCount = document.getElementById("displayTotalCount");
const displayTotalPoints = document.getElementById("displayTotalPoints");
const btnTriggerBid = document.getElementById("btnTriggerBid");

let bidRegistry = [];

function refreshBidList() {
  if (bidRegistry.length === 0) {
    bidDisplayArea.innerHTML =
      '<div class="empty-state p-10 text-center text-slate-400 italic text-sm">Waiting for selection...</div>';
    displayTotalCount.innerText = "0";
    displayTotalPoints.innerText = "0";
    return;
  }

  bidDisplayArea.innerHTML = "";
  let runningSum = 0;

  bidRegistry.forEach((entry, idx) => {
    runningSum += parseInt(entry.amount);
    const tableRow = document.createElement("div");
    tableRow.className =
      "list-row grid grid-cols-4 items-center p-4 text-center hover:bg-emerald-50/30 transition-colors";
    tableRow.innerHTML = `
                    <span class="digit-val font-bold text-xl text-slate-700">${entry.digit}</span>
                    <span class="amount-val text-slate-500 font-semibold">${entry.amount}</span>
                    <span class="type-badge text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 inline-block mx-auto uppercase">${entry.type}</span>
                    <button onclick="deleteEntry(${idx})" class="delete-btn text-rose-300 hover:text-rose-500 transition-all transform hover:scale-110">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                `;
    bidDisplayArea.appendChild(tableRow);
  });

  displayTotalCount.innerText = bidRegistry.length;
  displayTotalPoints.innerText = runningSum;
}

function populateRegistry(mode) {
  const currentVal = inputPointsAmount.value || 0;
  const currentTiming = selectGameTiming.value;
  const digitSet = mode === "odd" ? [1, 3, 5, 7, 9] : [0, 2, 4, 6, 8];

  bidRegistry = digitSet.map((num) => ({
    digit: num,
    amount: currentVal,
    type: currentTiming,
  }));
  refreshBidList();
}

function deleteEntry(idx) {
  bidRegistry.splice(idx, 1);
  refreshBidList();
}

// Event Listeners
radioPatternOdd.addEventListener("change", () => populateRegistry("odd"));
radioPatternEven.addEventListener("change", () => populateRegistry("even"));

btnTriggerBid.addEventListener("click", () => {
  if (radioPatternOdd.checked) populateRegistry("odd");
  else if (radioPatternEven.checked) populateRegistry("even");
  else alert("Action required: Select a pattern (Odd/Even)");
});
