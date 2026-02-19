document.addEventListener("DOMContentLoaded", function () {

  // ====== Modal Elements ======
  const modal = document.getElementById('notificationModal');
  const openBtn = document.getElementById('openModal');
  const closeBtn = document.getElementById('closeBtn');
  const closeIcon = document.getElementById('closeIcon');
  const form = modal.querySelector('form');

  // ====== Open Modal ======
  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  // ====== Hide Modal Function ======
  const hideModal = () => modal.classList.add('hidden');

  // ====== Close Events ======
  closeBtn.addEventListener('click', hideModal);
  closeIcon.addEventListener('click', hideModal);
  window.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  // ====== Custom Message Box ======
  function showMessage(message, type = "success") {
    const oldMsg = document.getElementById("customMessageBox");
    if (oldMsg) oldMsg.remove();

    const msgBox = document.createElement("div");
    msgBox.id = "customMessageBox";
    msgBox.innerText = message;
    msgBox.style.position = "fixed";
    msgBox.style.top = "150px"; // bich me thoda niche
    msgBox.style.left = "50%";
    msgBox.style.transform = "translateX(-50%)";
    msgBox.style.padding = "12px 20px";
    msgBox.style.borderRadius = "6px";
    msgBox.style.fontWeight = "500";
    msgBox.style.color = "#fff";
    msgBox.style.zIndex = "9999";
    msgBox.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    msgBox.style.transition = "0.3s ease";
    msgBox.style.backgroundColor = type === "error" ? "#e74c3c" : "#2ecc71";

    document.body.appendChild(msgBox);

    setTimeout(() => {
      msgBox.style.opacity = "0";
      setTimeout(() => msgBox.remove(), 300);
    }, 3000);
  }

  // ====== Form Submit ======
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = form.querySelector('input[name="title"]').value.trim();
    const message = form.querySelector('textarea[name="message"]').value.trim();

    if (!title || !message) {
      showMessage("Please fill both title and message", "error");
      return;
    }

    try {
      const res = await fetch(form.action, {
        method: form.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
      });

      const data = await res.json();

      if (data.success) {
        showMessage("Notification saved successfully ✅");
        form.reset();
        hideModal();
      } else {
        showMessage(data.message || "Failed to save notification", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Server error", "error");
    }
  });

  

  // ====== Search & Limit (Table Search) ======
  const searchInput = document.getElementById('searchInput');
  const limitSelect = document.getElementById('limitSelect');

  // Search on Enter
  searchInput.addEventListener('keyup', function(e){
      if(e.key === "Enter"){
          const search = searchInput.value.trim();
          const limit = limitSelect.value;
          window.location.href = `?page=1&limit=${limit}&search=${encodeURIComponent(search)}`;
      }
  });

  // Change limit
  limitSelect.addEventListener('change', function(){
      const limit = limitSelect.value;
      const search = searchInput.value.trim();
      window.location.href = `?page=1&limit=${limit}&search=${encodeURIComponent(search)}`;
  });

  // ====== Optional Sidebar Search ======
  const sidebarSearch = document.querySelector('aside input[placeholder="Search"]');
  if (sidebarSearch) {
    sidebarSearch.addEventListener('keyup', function(e){
      if(e.key === "Enter"){
        const search = sidebarSearch.value.trim();
        const limit = limitSelect.value;
        window.location.href = `?page=1&limit=${limit}&search=${encodeURIComponent(search)}`;
      }
    });
  }


});

