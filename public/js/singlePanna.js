
        const pattiData = {
            "0": ["127", "136", "145", "190", "235", "280", "370", "389", "460", "479", "569", "578"],
            "1": ["128", "137", "146", "236", "245", "290", "380", "470", "489", "560", "678", "579"],
            "2": ["129", "138", "147", "156", "237", "246", "345", "390", "480", "570", "679", "589"],
            "3": ["120", "139", "148", "157", "238", "247", "256", "346", "490", "580", "670", "689"],
            "4": ["130", "149", "158", "167", "239", "248", "257", "347", "356", "590", "680", "789"],
            "5": ["140", "159", "168", "230", "249", "258", "267", "348", "357", "456", "690", "780"],
            "6": ["123", "150", "169", "178", "240", "259", "268", "349", "358", "457", "367", "790"],
            "7": ["124", "160", "179", "250", "269", "278", "340", "359", "368", "458", "467", "890"],
            "8": ["125", "134", "170", "189", "260", "279", "350", "369", "378", "459", "567", "468"],
            "9": ["126", "135", "180", "234", "270", "289", "360", "379", "450", "469", "478", "568"]
        };

        let allBids = {}; 

        const digitBar = document.getElementById('digitBar');
        const pattiGrid = document.getElementById('pattiGrid');
        const grandTotal = document.getElementById('grandTotal');

        function init() {
            for (let i = 0; i <= 9; i++) {
                const btn = document.createElement('button');
                btn.id = `btn-${i}`;
                btn.className = "min-w-[48px] h-[48px] border-2 border-[#005c4b] rounded-xl font-bold transition-all flex-shrink-0 hover:bg-[#005c4b]/5";
                btn.innerText = i;
                btn.onclick = () => loadDigit(i);
                digitBar.appendChild(btn);
            }
            loadDigit(0); 
        }

        function loadDigit(digit) {
            document.querySelectorAll('#digitBar button').forEach(b => {
                b.classList.remove('bg-[#005c4b]', 'text-white', 'shadow-md');
                b.classList.add('bg-white', 'text-[#005c4b]');
            });
            const activeBtn = document.getElementById(`btn-${digit}`);
            activeBtn.classList.replace('bg-white', 'bg-[#005c4b]');
            activeBtn.classList.replace('text-[#005c4b]', 'text-white');
            activeBtn.classList.add('shadow-md');

            pattiGrid.innerHTML = '';
            pattiData[digit].forEach(num => {
                const savedValue = allBids[num] || "";
                const card = document.createElement('div');
                card.className = "flex border-2 border-gray-100 rounded-xl overflow-hidden h-14 shadow-sm hover:border-[#005c4b] transition-all bg-white group";
                card.innerHTML = `
                    <div class="w-[40%] bg-gray-100 group-hover:bg-[#005c4b] group-hover:text-white text-gray-700 flex items-center justify-center font-bold text-sm transition-colors">
                        ${num}
                    </div>
                    <input type="number" 
                           inputmode="numeric"
                           value="${savedValue}"
                           oninput="updateBid('${num}', this.value)"
                           placeholder="-" 
                           class="w-[60%] text-center outline-none text-gray-800 font-black text-lg bg-transparent focus:bg-emerald-50 transition-colors">
                `;
                pattiGrid.appendChild(card);
            });
        }

        function updateBid(num, val) {
            if (val === "" || parseFloat(val) <= 0) {
                delete allBids[num];
            } else {
                allBids[num] = parseFloat(val);
            }
            calculateTotal();
        }

        function calculateTotal() {
            const total = Object.values(allBids).reduce((acc, curr) => acc + curr, 0);
            grandTotal.innerText = total.toLocaleString('en-IN');
        }

        function showToast(msg) {
            const x = document.getElementById("snackbar");
            x.innerText = msg;
            x.className = "show";
            setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
        }

        function submitBids() {
            if (Object.keys(allBids).length === 0) {
                showToast("Enter amount to submit!");
                return;
            }
            showToast("Bids Saved!");
            console.log("Submit Data:", allBids);
        }

        init();
