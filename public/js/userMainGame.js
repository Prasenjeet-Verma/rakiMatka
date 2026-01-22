// //////////////////////////////////////////// Dom Manuplution ///////////////////////////////////////////////////

// 1. Define the relationship between Buttons and their Screens
const screenMap = {
  btnSingleDigit: "mainContent",
  btnBulkDigit: "SingleBulkDigit",
  btnJodiDigit: "jodiDigit",
  btnJodiDigitBulk: "jodiDigitBulk",
  btnSinglePanna: "singlePanna",
  btnSinglePannaBulk: "singlePannaBulk",
  btnDoublePanna: "DoublePanna",
  btnDoublePannaBulk: "DoublePannaBulk",
  btnTriplePanna: "triplePanna",
  btnOddEven: "oddEven",
  btnHalfSangam: "halfSugam",
  btnFullSangam: "fullSugam",
  btnSPMotor: "sPMotor ",
  btnDPMotor: "dPMotor ",
  btnSPDPTP: "sPDPTP ",
  btnRedBracket: "redBracket",
};

// 2. Define the relationship between Close Arrows and their Screens
const closeMap = {
  closeSingle: "mainContent",
  closeBulk: "SingleBulkDigit",
  closeJodiDigit: "jodiDigit",
  closeJodiDigitBulk: "jodiDigitBulk",
  closeSinglePanna: "singlePanna",
  closeSinglePannaBulk: "singlePannaBulk",
  closeDoublePanna: "DoublePanna",
  closeDoublePannaBulk: "DoublePannaBulk",
  closeTriplePanna: "triplePanna",
  closeOddEven: "oddEven",
  closeHalfSugam: "halfSugam",
  closeFullSugam: "fullSugam",
  closeSPDPTP: "sPDPTP ",
  closeRedBracket: "redBracket",

  // --- Added SP DP TP Close Button ---

  "closeSPMotor ": "sPMotor ",
  "closeDPMotor ": "dPMotor ",
};

// 3. Open Logic
Object.keys(screenMap).forEach((btnId) => {
  const btn = document.getElementById(btnId);
  const screen = document.getElementById(screenMap[btnId]);

  if (btn && screen) {
    btn.addEventListener("click", () => {
      screen.classList.remove("hidden");
      // Initialize grid if Bulk Digit is clicked
      if (btnId === "btnBulkDigit" && typeof initGrid === "function") {
        initGrid();
      }
    });
  }
});

// 4. Close Logic
Object.keys(closeMap).forEach((closeId) => {
  const closeBtn = document.getElementById(closeId);
  const screen = document.getElementById(closeMap[closeId]);

  if (closeBtn && screen) {
    closeBtn.addEventListener("click", () => {
      screen.classList.add("hidden");
    });
  }
});
