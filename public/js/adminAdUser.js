document.addEventListener("DOMContentLoaded", () => {

  // ======================
  // USER CREATE MODAL
  // ======================
  const openModal = document.getElementById("openModal");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");
  const userModal = document.getElementById("userModal");

  if (openModal && closeModal && cancelModal && userModal) {

    openModal.onclick = () => {
      userModal.classList.remove("hidden");
    };

    closeModal.onclick = () => {
      userModal.classList.add("hidden");
    };

    cancelModal.onclick = () => {
      userModal.classList.add("hidden");
    };

    userModal.onclick = (e) => {
      if (e.target === userModal) {
        userModal.classList.add("hidden");
      }
    };
  }

  // ======================
  // BLOCK / UNBLOCK SYSTEM
  // ======================
  let selectedUserForBlock = null;

  window.toggleUser = function (userId) {
    selectedUserForBlock = userId;
    const modal = document.getElementById("blockConfirmModal");
    if (modal) modal.classList.remove("hidden");
  };

  const blockModal = document.getElementById("blockConfirmModal");
  const cancelBlock = document.getElementById("cancelBlock");
  const confirmBlock = document.getElementById("confirmBlock");

  if (cancelBlock && confirmBlock && blockModal) {

    cancelBlock.onclick = () => {
      blockModal.classList.add("hidden");
      selectedUserForBlock = null;
    };

    confirmBlock.onclick = async () => {
      if (!selectedUserForBlock) return;

      try {
        const res = await fetch(`/admin/user-status/${selectedUserForBlock}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();
        if (data.success) location.reload();
      } catch (err) {
        console.error("Toggle user failed", err);
      }
    };
  }

});
