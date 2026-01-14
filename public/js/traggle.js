const tabs = {
  main: document.getElementById("tab-main"),
  star: document.getElementById("tab-star"),
  gali: document.getElementById("tab-gali"),
};

const sections = {
  main: document.getElementById("mainMarket"),
  star: document.getElementById("starLine"),
  gali: document.getElementById("galiDesawar"),
};

function resetTabs() {
  Object.values(tabs).forEach((tab) => {
    tab.classList.remove("bg-blue-700", "text-white");
    tab.classList.add("bg-gray-100", "text-gray-700");
  });
}

function hideSections() {
  Object.values(sections).forEach((sec) => sec.classList.add("hidden"));
}

tabs.main.onclick = () => {
  resetTabs();
  hideSections();
  tabs.main.classList.remove("bg-gray-100", "text-gray-700");
  tabs.main.classList.add("bg-blue-700", "text-white");
  sections.main.classList.remove("hidden");
};

tabs.star.onclick = () => {
  resetTabs();
  hideSections();
  tabs.star.classList.remove("bg-gray-100", "text-gray-700");
  tabs.star.classList.add("bg-blue-700", "text-white");
  sections.star.classList.remove("hidden");
};

tabs.gali.onclick = () => {
  resetTabs();
  hideSections();
  tabs.gali.classList.remove("bg-gray-100", "text-gray-700");
  tabs.gali.classList.add("bg-blue-700", "text-white");
  sections.gali.classList.remove("hidden");
};
