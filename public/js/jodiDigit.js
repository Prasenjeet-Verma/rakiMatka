// const jodiTabs = document.getElementById('jodiTabs');
const jodiGrid = document.getElementById('jodiGrid');
const jodiTotalDisplay = document.getElementById('jodiTotalAmount');
const closeJodiBtn = document.getElementById('closeJodiDigit');
const jodiMain = document.getElementById('jodiDigit');

let jodiBidData = {}; // Stores all bids across all tabs

// Initialize
function initJodiModule() {
    // Generate Tabs 0-9
    jodiTabs.innerHTML = '';
    for (let i = 0; i <= 9; i++) {
        const tab = document.createElement('button');
        tab.className = `min-w-[45px] h-[45px] rounded-full border-2 flex items-center justify-center font-bold transition-all shrink-0 ${i === 0 ? 'bg-[#005c4b] border-[#005c4b] text-white shadow-md' : 'border-gray-200 text-gray-400'}`;
        tab.innerText = i;
        tab.onclick = () => switchJodiTab(i, tab);
        jodiTabs.appendChild(tab);
    }
    renderJodiGrid(0);
}

function switchJodiTab(index, element) {
    // UI Update for Tabs
    Array.from(jodiTabs.children).forEach(tab => {
        tab.className = "min-w-[45px] h-[45px] rounded-full border-2 flex items-center justify-center font-bold border-gray-200 text-gray-400 shrink-0";
    });
    element.className = "min-w-[45px] h-[45px] rounded-full border-2 flex items-center justify-center font-bold bg-[#005c4b] border-[#005c4b] text-white shadow-md";
    
    renderJodiGrid(index);
}

function renderJodiGrid(tabIndex) {
    jodiGrid.innerHTML = '';
    const startNum = tabIndex * 10;

    for (let i = 0; i < 10; i++) {
        const fullNum = (startNum + i).toString().padStart(2, '0');
        const card = document.createElement('div');
        card.className = "flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm h-14 focus-within:ring-2 focus-within:ring-[#005c4b]/30 focus-within:border-[#005c4b]";
        
        card.innerHTML = `
            <div class="w-1/3 bg-[#005c4b] text-white flex items-center justify-center font-black text-lg">
                ${fullNum}
            </div>
            <input type="number" 
                   class="w-2/3 px-3 outline-none text-gray-800 font-bold text-center" 
                   placeholder="Points" 
                   value="${jodiBidData[fullNum] || ''}" 
                   oninput="updateJodiValue('${fullNum}', this.value)">
        `;
        jodiGrid.appendChild(card);
    }
}

window.updateJodiValue = (num, val) => {
    const points = parseInt(val) || 0;
    if (points > 0) {
        jodiBidData[num] = points;
    } else {
        delete jodiBidData[num];
    }
    calculateJodiTotal();
};

function calculateJodiTotal() {
    const total = Object.values(jodiBidData).reduce((a, b) => a + b, 0);
    jodiTotalDisplay.innerText = total;
}

function submitJodiBids() {
    const total = Object.values(jodiBidData).reduce((a, b) => a + b, 0);
    if (total <= 0) {
        alert("Please enter points to submit a bid.");
        return;
    }
    console.log("Submitting Bids:", jodiBidData);
    alert(`Successfully placed bids worth ₹${total}`);
}

// Close Module
closeJodiBtn.onclick = () => {
    jodiMain.classList.add('hidden');
};

// Start
initJodiModule();