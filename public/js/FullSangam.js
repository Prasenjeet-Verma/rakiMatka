document.addEventListener("DOMContentLoaded", () => {
  /* ================= ELEMENTS ================= */
  const main = document.getElementById("fullSugam");

  const openInput = main.querySelectorAll("input")[0];
  const closeInput = main.querySelectorAll("input")[1];
  const pointsInput = main.querySelectorAll("input")[2];

  const addBtn = main.querySelector("button:not(#fullSangam)");
  const submitBtn = document.getElementById("fullSangam");

  const bidsText = main.querySelectorAll(".text-gray-600")[0];
  const amountText = main.querySelectorAll(".text-gray-600")[1];

  const gameId = main.dataset.gameId;
  const gameName = main.dataset.gameName;

  /* ================= STORE ================= */
  let bids = [];
  let totalBids = 0;
  let totalAmount = 0;

  /* ================= MESSAGE ================= */
  function showMessage(msg, type = "success") {
    const box = document.createElement("div");
    box.innerText = msg;
    box.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      padding:12px 26px;border-radius:14px;
      background:${type === "success" ? "#16a34a" : "#dc2626"};
      color:#fff;font-weight:700;z-index:9999
    `;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
  }

  /* ================= DATE / TIME ================= */
  function getPlayedInfo() {
    const now = new Date();
    return {
      playedDate: now.toLocaleDateString("en-GB"),
      playedTime: now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      playedWeekday: now.toLocaleDateString("en-US", {
        weekday: "long",
      }),
    };
  }

  /* ================= UPDATE BOTTOM BAR ================= */
  function refreshBottomBar() {
    bidsText.innerText = totalBids;
    amountText.innerText = totalAmount;
  }

  /* ================= ADD BID ================= */
  addBtn.addEventListener("click", () => {
    const openPana = openInput.value.trim();
    const closePana = closeInput.value.trim();
    const points = Number(pointsInput.value);

if (!openPana || isNaN(openPana)) {
  showMessage("Enter valid Open Pana ❌", "error");
  return;
}

if (!closePana || isNaN(closePana)) {
  showMessage("Enter valid Close Pana ❌", "error");
  return;
}


    if (!points || points <= 0) {
      showMessage("Enter valid Points ❌", "error");
      return;
    }

    const bidObj = {
      gameId,
      gameName,
      openPana,
      closePana,
      points,
      totalAmount: points,
      gameType: "FULL_SANGAM",
      ...getPlayedInfo(),
    };

    bids.push(bidObj);
    totalBids++;
    totalAmount += points;

    refreshBottomBar();
    showMessage("Bid added successfully ✅");

    openInput.value = "";
    closeInput.value = "";
    pointsInput.value = "";
    openInput.focus();
  });

  /* ================= SUBMIT ALL ================= */
/* ================= SUBMIT ALL ================= */
submitBtn.addEventListener("click", async () => {
  if (bids.length === 0) {
    showMessage("Add at least one bid ❌", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting...";

  try {
    const res = await fetch("/full-sangam/place-bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        gameType: "FULL_SANGAM",
        totalBids,
        totalAmount,
        bids,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Something went wrong ❌", "error");
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit";
      return;
    }

    // ✅ here we add totalAmount
    showMessage(`Full Sangam bids placed successfully ₹${totalAmount} ✅`);

    // reset
    bids = [];
    totalBids = 0;
    totalAmount = 0;
    refreshBottomBar();

    submitBtn.disabled = false;
    submitBtn.innerText = "Submit";
  } catch (err) {
    console.error(err);
    showMessage("Server error ❌", "error");
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit";
  }
});

});
