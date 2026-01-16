function openSidebar() {
  document.getElementById("sidebar").style.transform = "translateX(0)";
  document.getElementById("overlay").classList.remove("hidden");
}

function closeSidebar() {
  document.getElementById("sidebar").style.transform = "translateX(-100%)";
  document.getElementById("overlay").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const views = {
    dashboard: document.getElementById("mainDashboard"),
    starline: document.getElementById("starLineView"),
    jackpot: document.getElementById("jackpotView"),
    wallet: document.getElementById("walletView"),
    withdraw: document.getElementById("withdrawView"),
    addMoney: document.getElementById("addMoneyView"),
  };

  const showView = (targetView) => {
    closeSidebar();
    Object.values(views).forEach((v) => v.classList.add("hidden"));
    targetView.classList.remove("hidden");
    window.scrollTo(0, 0);
  };

  const showDashboard = () => {
    Object.values(views).forEach((v) => v.classList.add("hidden"));
    views.dashboard.classList.remove("hidden");
    window.scrollTo(0, 0);
  };

  // Event Listeners for Triggers
  document
    .getElementById("starlineTrigger")
    .addEventListener("click", () => showView(views.starline));
  document
    .getElementById("sidebarStarline")
    .addEventListener("click", () => showView(views.starline));
  document
    .getElementById("jackpotTrigger")
    .addEventListener("click", () => showView(views.jackpot));
  document
    .getElementById("sidebarjackpotView")
    .addEventListener("click", () => showView(views.jackpot));
  document
    .getElementById("walletTrigger")
    .addEventListener("click", () => showView(views.wallet));
  document
    .getElementById("sidebarwalletView")
    .addEventListener("click", () => showView(views.wallet));
  document
    .getElementById("withdrawTrigger")
    .addEventListener("click", () => showView(views.withdraw));
  document
    .getElementById("sidebarwithdrawView")
    .addEventListener("click", () => showView(views.withdraw));
  document
    .getElementById("addMoneyTrigger")
    .addEventListener("click", () => showView(views.addMoney));
  document
    .getElementById("sidebaraddMoneyView")
    .addEventListener("click", () => showView(views.addMoney));

  // Global Back Button functionality
  document.querySelectorAll(".backBtn").forEach((btn) => {
    btn.addEventListener("click", showDashboard);
  });
});

// ===================================== DOM is here ==============================

const autoTab = document.getElementById("autoTab");
const qrTab = document.getElementById("qrTab");
const autoSection = document.getElementById("autoSection");
const qrSection = document.getElementById("qrSection");
const qrFooter = document.getElementById("qrFooter");

autoTab.onclick = () => {
  autoSection.classList.remove("hidden");
  qrSection.classList.add("hidden");
  qrFooter.classList.add("hidden");

  autoTab.classList.add("text-purple-600", "border-b-2", "border-teal-700");
  qrTab.classList.remove("text-purple-600", "border-b-2", "border-teal-700");
  qrTab.classList.add("text-gray-500");
};

qrTab.onclick = () => {
  qrSection.classList.remove("hidden");
  autoSection.classList.add("hidden");
  qrFooter.classList.remove("hidden");

  qrTab.classList.add("text-purple-600", "border-b-2", "border-teal-700");
  autoTab.classList.remove("text-purple-600", "border-b-2", "border-teal-700");
  autoTab.classList.add("text-gray-500");
};
