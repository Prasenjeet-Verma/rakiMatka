const patti_map = {
  0: [127, 136, 145, 190, 235, 280, 370, 479, 460, 569, 389, 578],
  1: [128, 137, 146, 236, 245, 290, 380, 470, 489, 560, 678, 579],
  2: [129, 138, 147, 156, 237, 246, 345, 390, 480, 570, 679, 589],
  3: [120, 139, 148, 157, 238, 247, 256, 346, 490, 580, 670, 689],
  4: [130, 149, 158, 167, 239, 248, 257, 347, 356, 590, 680, 789],
  5: [140, 159, 168, 230, 249, 258, 267, 348, 357, 456, 690, 780],
  6: [123, 150, 169, 178, 240, 259, 268, 349, 358, 457, 367, 790],
  7: [124, 160, 179, 250, 269, 278, 340, 359, 368, 458, 467, 890],
  8: [125, 134, 170, 189, 260, 279, 350, 369, 378, 459, 567, 468],
  9: [126, 135, 180, 234, 270, 289, 360, 379, 450, 469, 478, 568],
};

let db_store = [];

function handleToggle() {
  const el = document.getElementById("toggle-session");
  el.innerText = el.innerText === "OPEN" ? "CLOSE" : "OPEN";
}

function processSelection(num) {
  const val = parseInt(document.getElementById("val-input").value) || 0;
  const mode = document.getElementById("toggle-session").innerText;

  if (val <= 0) {
    alert("Enter points");
    return;
  }

  const selection_set = patti_map[num];

  selection_set.forEach((d) => {
    db_store.push({
      uid: Math.random().toString(36).substr(2, 9),
      digit: d,
      pts: val,
      mode: mode,
    });
  });

  refreshView();
}

function removeItem(uid) {
  db_store = db_store.filter((item) => item.uid !== uid);
  refreshView();
}

function refreshView() {
  const list = document.getElementById("scroll-area");
  list.innerHTML = "";

  let total_pts = 0;

  [...db_store].reverse().forEach((item) => {
    total_pts += item.pts;
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-4 text-center items-center bg-white py-4 rounded-xl shadow-sm border border-gray-100 mb-2";
    row.innerHTML = `
                    <span class="text-sm font-bold text-gray-700">${item.digit}</span>
                    <span class="text-sm text-gray-600 font-medium">${item.pts}</span>
                    <span class="type-label text-[10px] font-black text-brand-teal bg-teal-50 py-1 rounded-full mx-2 uppercase">${item.mode}</span>
                    <button onclick="removeItem('${item.uid}')" class=" hover:text-red-500 transition-colors">
                        <i class="fa-solid fa-trash-can text-red-400 cursor-pointer p-2 active:text-red-600"></i>
                    </button>
                `;
    list.appendChild(row);
  });

  document.getElementById("stat-count").innerText = db_store.length;
  document.getElementById("stat-sum").innerText = total_pts;
}
