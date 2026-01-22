document.addEventListener("DOMContentLoaded", () => {
  /* ================= GLOBAL MESSAGE BOX ================= */
  function showMessage(message, type = "success") {
    const old = document.getElementById("jsMsgBox");
    if (old) old.remove();

    const box = document.createElement("div");
    box.id = "jsMsgBox";
    box.innerText = message;

    Object.assign(box.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "12px 26px",
      borderRadius: "14px",
      color: "#fff",
      fontWeight: "700",
      fontSize: "14px",
      zIndex: "99999",
      boxShadow: "0 15px 30px rgba(0,0,0,.3)",
      background:
        type === "success"
          ? "linear-gradient(135deg,#16a34a,#22c55e)"
          : "linear-gradient(135deg,#dc2626,#ef4444)",
      transition: "all .4s ease",
    });

    document.body.appendChild(box);

    setTimeout(() => {
      box.style.opacity = "0";
      box.style.top = "0px";
    }, 4000);

    setTimeout(() => box.remove(), 4500);
  }

  const openJodiBtn = document.getElementById("btnJodiDigit");
  const jodiMain = document.getElementById("jodiDigit");
  const closeJodiBtn = document.getElementById("closeJodiDigit");
  const jodiTabs = document.getElementById("jodiTabs");
  const jodiGrid = document.getElementById("jodiGrid");
  const jodiTotalDisplay = document.getElementById("jodiTotalAmount");

  let jodiBidData = {};

  openJodiBtn?.addEventListener("click", () => {
    jodiMain.classList.remove("hidden");
    initJodi();
  });

  closeJodiBtn?.addEventListener("click", () => {
    jodiMain.classList.add("hidden");
  });

  function initJodi() {
    jodiBidData = {};
    jodiTabs.innerHTML = "";
    jodiGrid.innerHTML = "";
    jodiTotalDisplay.innerText = "0";

    for (let i = 0; i <= 9; i++) {
      const tab = document.createElement("button");
      tab.className =
        i === 0
          ? "min-w-[45px] h-[45px] rounded-full bg-[#005c4b] text-white font-bold shadow-md"
          : "min-w-[45px] h-[45px] rounded-full border text-gray-400";
      tab.innerText = i;
      tab.onclick = () => switchTab(i, tab);
      jodiTabs.appendChild(tab);
    }

    renderJodiGrid(0);
  }

  function switchTab(index, activeTab) {
    [...jodiTabs.children].forEach(tab => {
      tab.className = "min-w-[45px] h-[45px] rounded-full border text-gray-400";
    });
    activeTab.className = "min-w-[45px] h-[45px] rounded-full bg-[#005c4b] text-white font-bold shadow-md";
    renderJodiGrid(index);
  }

  function renderJodiGrid(mainNo) {
    jodiGrid.innerHTML = "";
    const startNum = mainNo * 10;

    for (let i = 0; i < 10; i++) {
      const underNo = (startNum + i).toString().padStart(2, "0");

      const card = document.createElement("div");
      card.className = "flex bg-white border rounded-xl overflow-hidden h-14";

      card.innerHTML = `
        <div class="w-1/3 bg-[#005c4b] text-white flex items-center justify-center font-black text-lg">
          ${underNo}
        </div>
        <input type="number"
          class="w-2/3 text-center font-bold outline-none"
          placeholder="Points"
          value="${jodiBidData[underNo]?.amount || ""}"
        />
      `;

      const input = card.querySelector("input");
      input.addEventListener("input", e => {
        const val = parseInt(e.target.value);
        if (val > 0) jodiBidData[underNo] = { mainNo, underNo, amount: val };
        else delete jodiBidData[underNo];
        updateJodiTotal();
      });

      jodiGrid.appendChild(card);
    }
  }

  function updateJodiTotal() {
    const total = Object.values(jodiBidData).reduce((a, b) => a + b.amount, 0);
    jodiTotalDisplay.innerText = total;
  }

  window.submitJodiBids = function () {
    const activeBets = Object.values(jodiBidData);
    if (activeBets.length === 0) {
      showMessage("Please enter points ❌", "error");
      return;
    }

    const payload = {
      gameId: jodiMain.dataset.gameId,
      gameName: jodiMain.dataset.gameName,
      bets: activeBets,
      totalAmount: activeBets.reduce((s, b) => s + b.amount, 0)
    };

    fetch("/jodi-digit/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showMessage(data.message || `Bets placed ₹${payload.totalAmount} ✅`, "success");
          initJodi();
        } else {
          showMessage(data.message || "Bet failed ❌", "error");
        }
      })
      .catch(err => {
        console.error(err);
        showMessage("Server error ❌", "error");
      });
  };
});
