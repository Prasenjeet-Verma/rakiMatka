document.addEventListener("DOMContentLoaded", () => {
    // 1. Data Definitions
    const pattiData = {
        0: [550, 668, 244, 299, 226, 488, 677, 118, 334],
        1: [100, 119, 155, 227, 335, 344, 399, 588, 669],
        2: [200, 110, 228, 255, 336, 499, 660, 688, 778],
        3: [300, 166, 229, 337, 355, 445, 599, 779, 788],
        4: [400, 112, 220, 266, 338, 446, 455, 699, 770],
        5: [500, 113, 122, 177, 339, 366, 447, 799, 889],
        6: [600, 114, 277, 330, 448, 466, 556, 880, 899],
        7: [700, 115, 133, 188, 223, 377, 449, 557, 566],
        8: [800, 116, 224, 233, 288, 440, 477, 558, 990],
        9: [900, 117, 144, 199, 225, 388, 559, 577, 667],
    };

    // 2. Selectors
    const bidList = document.getElementById("bid-list");
    const digitGrid = document.getElementById("digit-grid");
    const pointsInput = document.getElementById("points-input");
    const gameTypeSelect = document.getElementById("game-type");
    const totalBidEl = document.getElementById("total-bid");
    const totalPointsEl = document.getElementById("total-points");

    let selectedHistory = [];

    // 3. Dynamic UI Elements
    const historyContainer = document.createElement("div");
    historyContainer.className = "mb-4 flex flex-wrap gap-2 items-center min-h-[32px]";
    historyContainer.innerHTML = '<span class="text-xs font-bold text-gray-400 uppercase">Selected:</span>';
    
    // Inject history bar above the grid
    if (digitGrid) {
        digitGrid.parentNode.insertBefore(historyContainer, digitGrid);
    }

    // 4. Initialize Digit Buttons
    if (digitGrid) {
        for (let i = 0; i <= 9; i++) {
            const btn = document.createElement("button");
            btn.className = "bg-brand-teal text-white py-3 rounded-xl font-bold transition-all border-4 border-transparent shadow-md active:scale-90";
            btn.innerText = i;
            btn.onclick = () => {
                btn.classList.add("border-accent-green");
                setTimeout(() => btn.classList.remove("border-accent-green"), 300);
                selectDigit(i);
                updateHistory(i);
            };
            digitGrid.appendChild(btn);
        }
    }

    // 5. Logic Functions
    function updateHistory(num) {
        selectedHistory.push(num);
        const badge = document.createElement("span");
        badge.className = "bg-brand-teal text-white text-xs px-2 py-1 rounded-md font-bold animate-pulse";
        badge.innerText = num;
        historyContainer.appendChild(badge);
        setTimeout(() => badge.classList.remove("animate-pulse"), 500);
    }

    function selectDigit(num) {
        const currentPoints = pointsInput.value || 0;
        const currentGameType = gameTypeSelect.value;

        pattiData[num].forEach((digit) => {
            const row = document.createElement("div");
            row.className = "grid grid-cols-4 text-center items-center bg-white py-4 rounded-xl shadow-sm border border-gray-100 mb-2";
            row.innerHTML = `
                <span class="text-sm font-bold text-gray-700">${digit}</span>
                <span class="text-sm text-gray-600 font-medium">${currentPoints}</span>
                <span class="type-label text-[10px] font-black text-brand-teal bg-teal-50 py-1 rounded-full mx-2 uppercase">${currentGameType}</span>
                <div class="flex justify-center">
                    <i class="fa-solid fa-trash-can text-red-400 cursor-pointer p-2 active:text-red-600" onclick="removeRow(this)"></i>
                </div>
            `;
            bidList.prepend(row);
        });
        updateTotals();
    }

    // Global helper for the trash icon
    window.removeRow = (element) => {
        element.closest('.grid').remove();
        updateTotals();
    };

    function updateTotals() {
        const rows = bidList.children.length;
        const points = Array.from(bidList.children).reduce((acc, row) => {
            const val = parseInt(row.children[1].innerText);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);

        totalBidEl.innerText = rows;
        totalPointsEl.innerText = points;
    }

    // 6. Global Function Exports (Important for HTML Attributes)
    window.updateExistingBidsType = () => {
        const newType = gameTypeSelect.value;
        const labels = document.querySelectorAll(".type-label");
        labels.forEach((label) => {
            label.innerText = newType;
        });
    };

    window.submitData = () => {
        const total = totalPointsEl.innerText;
        if (total == "0") {
            alert("Please select a digit first!");
        } else {
            alert(`Bids Submitted Successfully!\nTotal Bids: ${totalBidEl.innerText}\nTotal Points: ${total}`);
            // Clear UI
            bidList.innerHTML = "";
            historyContainer.innerHTML = '<span class="text-xs font-bold text-gray-400 uppercase">Selected:</span>';
            selectedHistory = [];
            updateTotals();
        }
    };
    
    // Initial total call
    updateTotals();
});