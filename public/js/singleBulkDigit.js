const gridContainer = document.getElementById("gridContainer");
const pointsInput = document.getElementById("pointsInput");
const totalBidsDisplay = document.getElementById("totalBids");
const totalAmountDisplay = document.getElementById("totalAmount");

// State: Array of 10 items representing digits 0-9
let bets = Array(10).fill(0);
let holdTimer;

// Initialize Grid
function initGrid() {
  gridContainer.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    const card = document.createElement("div");
    card.className = "digit-card";
    card.innerHTML = `${i}`;

    // Click Event
    card.onclick = () => handleCardClick(i);

    // Long Press (Hold to clear) Logic
    card.onmousedown = () => startHold(i);
    card.onmouseup = endHold;
    card.onmouseleave = endHold;

    // Mobile Touch Support
    card.ontouchstart = (e) => {
      startHold(i);
    };
    card.ontouchend = endHold;

    gridContainer.appendChild(card);
  }
  updateUI();
}

function handleCardClick(index) {
  const points = parseInt(pointsInput.value) || 0;
  if (points <= 0) return;

  if (bets[index] === 0) {
    bets[index] = points;
  } else {
    bets[index] *= 2; // Double the bet
  }
  updateUI();
}

function startHold(index) {
  holdTimer = setTimeout(() => {
    bets[index] = 0; // Clear bet
    if (navigator.vibrate) navigator.vibrate(40); // Haptic feedback
    updateUI();
  }, 700);
}

function endHold() {
  clearTimeout(holdTimer);
}

function updateUI() {
  let totalBids = 0;
  let totalAmount = 0;

  const cards = document.querySelectorAll(".digit-card");
  cards.forEach((card, i) => {
    const val = bets[i];

    // Clear existing badge
    const existingBadge = card.querySelector(".badge");
    if (existingBadge) existingBadge.remove();

    if (val > 0) {
      totalBids++;
      totalAmount += val;
      // Add Badge
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.innerText = val;
      card.appendChild(badge);
      // Style active card
      card.classList.add("brightness-125");
    } else {
      card.classList.remove("brightness-125");
    }
  });

  totalBidsDisplay.innerText = totalBids;
  totalAmountDisplay.innerText = totalAmount;
}

function submitBids() {
  const activeBids = bets
    .map((amt, digit) => ({ digit, amt }))
    .filter((b) => b.amt > 0);
  if (activeBids.length === 0) {
    alert("Please place at least one bet.");
    return;
  }
  console.log("Submitting Bids:", activeBids);
  alert(`Successfully submitted ${activeBids.length} bids!`);
}

// Start the app
initGrid();
