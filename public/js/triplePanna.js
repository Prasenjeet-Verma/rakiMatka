document.addEventListener("DOMContentLoaded", () => {
  const tpNumbers = [
    "000",
    "111",
    "222",
    "333",
    "444",
    "555",
    "666",
    "777",
    "888",
    "999",
  ];
  const tpGrid = document.getElementById("tp-main-grid");

  // 1. Generate Rows with unique class: tp-amount-input
  if (tpGrid) {
    tpNumbers.forEach((num) => {
      const div = document.createElement("div");
      div.className =
        "flex border-2 border-[#005c4b] rounded overflow-hidden bg-white hover:shadow-md transition-shadow";
      div.innerHTML = `
                        <div class="bg-[#005c4b] text-white w-12 md:w-16 flex items-center justify-center font-bold text-sm md:text-base">
                            ${num}
                        </div>
                        <input type="number" 
                               placeholder="0" 
                               class="tp-amount-input w-full p-2 outline-none text-gray-700 font-semibold" 
                               oninput="tpCalculateTotal()">
                    `;
      tpGrid.appendChild(div);
    });
  }

  // 2. Calculation Logic - Forced Global
  window.tpCalculateTotal = () => {
    const allInputs = document.querySelectorAll(".tp-amount-input");
    const totalField = document.getElementById("tp-final-total");
    let runningSum = 0;

    allInputs.forEach((input) => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        runningSum += val;
      }
    });

    if (totalField) {
      totalField.value = runningSum.toLocaleString();
    }
  };

  // 3. Dropdown Logic - Forced Global
  window.tpToggleMenu = () => {
    const menu = document.getElementById("tp-dropdown-box");
    if (menu) menu.classList.toggle("tp-hidden");
  };

  window.tpSetGameType = (val) => {
    const btn = document.getElementById("tp-select-trigger");
    const menu = document.getElementById("tp-dropdown-box");
    if (btn) btn.innerText = val;
    if (menu) menu.classList.add("tp-hidden");
  };

  // 4. Submission Logic - Forced Global
  window.tpSubmitFinalData = () => {
    const type = document.getElementById("tp-select-trigger").innerText;
    const total = document.getElementById("tp-final-total").value;
    alert(
      `Game Type: ${type}\nTotal Amount: ${total}\n\nSubmission Successful!`,
    );
  };
});
