   function updateOnlineStatus() {
      const message = document.getElementById("offlineMessage");

      if (!navigator.onLine) {
        message.style.display = "block";
      } else {
        message.style.display = "none";
      }
    }

    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);