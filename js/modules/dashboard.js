import * as auth from "./auth.js";

export async function initDashboardPage() {
  const status = await auth.isAuthenticated();
  if (!status.authenticated) {
    sessionStorage.setItem("tp_auth_notice", "Please log in to access the dashboard");
    window.location.replace("/index.html");
    return;
  }

  const user = status.user || {};
  const nameEl = document.getElementById("user-full-name");
  const roleEl = document.getElementById("user-role");
  const profileEl = document.getElementById("user-profile-image");

  if (nameEl) nameEl.textContent = user.full_name || "TindaPamilya User";
  if (roleEl) roleEl.textContent = `Role: ${user.role || "Seller"}`;
  if (profileEl && user.profile_image) profileEl.src = user.profile_image;

  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await auth.logout();
      sessionStorage.setItem("tp_auth_notice", "You have been logged out");
      window.location.replace("/index.html");
    });
  }
}
