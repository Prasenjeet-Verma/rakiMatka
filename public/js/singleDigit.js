document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("btnSingleDigit");
  const gameBox = document.getElementById("singleDigitGame");
  const closeBtn = document.getElementById("closeSingle");

  const grid = document.getElementById("singleDigitGrid");
  const totalDisplay = document.getElementById("singleDigitTotal");
  const submitBtn = document.getElementById("submitSingleDigit");
  const betTypeSelect = document.getElementById("betTypeSingle");

  /* ================= MESSAGE BOX FUNCTION ================= */
  function showMessage(message, type = "success") {
    // remove old box if exists
    const oldBox = document.getElementById("jsMsgBox");
    if (oldBox) oldBox.remove();

    const box = document.createElement("div");
    box.id = "jsMsgBox";
    box.innerText = message;

    // base styles
    box.style.position = "fixed";
    box.style.top = "20px";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.padding = "12px 24px";
    box.style.borderRadius = "12px";
    box.style.color = "#fff";
    box.style.fontWeight = "600";
    box.style.zIndex = "9999";
    box.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
    box.style.transition = "all 0.4s ease";
    box.style.width = "fit-content";

    // color by type
    box.style.background = type === "success" ? "#16a34a" : "#dc2626";

    document.body.appendChild(box);

    // auto hide after 5 sec
    setTimeout(() => {
      box.style.opacity = "0";
      box.style.top = "0px";
    }, 4500);

    setTimeout(() => box.remove(), 5000);
  }

  /* ================= OPEN / CLOSE GAME BOX ================= */
  openBtn.addEventListener("click", () => gameBox.classList.remove("hidden"));
  closeBtn.addEventListener("click", () => gameBox.classList.add("hidden"));

  /* ================= CREATE INPUTS 0-9 ================= */
  let html = "";
  for (let i = 0; i <= 9; i++) {
    html += `
      <div class="flex border-2 border-[#005c4b] rounded-lg overflow-hidden h-14">
        <div class="bg-[#005c4b] text-white w-1/3 flex items-center justify-center font-bold text-xl">
          ${i}
        </div>
        <input
          type="number"
          inputmode="numeric"
          placeholder="Amount"
          class="amount-input w-2/3 text-center font-semibold outline-none"
          data-number="${i}"
        />
      </div>
    `;
  }
  grid.innerHTML = html;

  /* ================= TOTAL CALCULATION ================= */
  grid.addEventListener("input", () => {
    let total = 0;
    grid.querySelectorAll(".amount-input").forEach(inp => {
      total += parseInt(inp.value) || 0;
    });
    totalDisplay.innerText = total;
  });

  /* ================= SUBMIT BET ================= */
  submitBtn.addEventListener("click", () => {
    const bets = [];
    grid.querySelectorAll(".amount-input").forEach(input => {
      const amount = parseInt(input.value);
      if (amount && amount > 0) {
        bets.push({
          number: Number(input.dataset.number),
          amount
        });
      }
    });

    if (bets.length === 0) {
      showMessage("Please enter at least one bet", "error");
      return;
    }

    const payload = {
      gameId: gameBox.dataset.gameId,
      gameName: gameBox.dataset.gameName,
      betType: betTypeSelect.value,
      bets,
      totalAmount: bets.reduce((s, b) => s + b.amount, 0)
    };

    console.log("BET DATA 👉", payload);

    fetch("/single-digit/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showMessage(data.message, "success");
         // setTimeout(() => window.location.reload(), 2000); // optional reload
        } else {
          showMessage(data.message, "error");
        }
      })
      .catch(err => {
        console.error(err);
        showMessage("Server error. Try again", "error");
      });
  });
});
