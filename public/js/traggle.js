const tabs = {
  main: document.getElementById("tab-main"),
  star: document.getElementById("tab-star"),
  gali: document.getElementById("tab-gali"),
};

// ⭐ All sections grouped properly
const sections = {
  main: [
    document.getElementById("mainMarketRates"),
    document.getElementById("mainMarket"),
  ],
  star: [
    document.getElementById("starLineRates"),
    document.getElementById("starLineGames"),
  ],
  gali: [
    document.getElementById("galiDesawarRates"),
    document.getElementById("galiDesawar"),
  ],
};

function resetTabs() {
  Object.values(tabs).forEach((tab) => {
    tab.classList.remove("bg-blue-700", "text-white");
    tab.classList.add("bg-gray-100", "text-gray-700");
  });
}

function hideSections() {
  Object.values(sections).forEach((group) => {
    group.forEach((sec) => {
      if (sec) sec.classList.add("hidden");
    });
  });
}

function activateTab(type) {
  resetTabs();
  hideSections();

  tabs[type].classList.remove("bg-gray-100", "text-gray-700");
  tabs[type].classList.add("bg-blue-700", "text-white");

  sections[type].forEach((sec) => {
    if (sec) sec.classList.remove("hidden");
  });
}

tabs.main.onclick = () => activateTab("main");
tabs.star.onclick = () => activateTab("star");
tabs.gali.onclick = () => activateTab("gali");