import * as auth from "./auth.js";
import { initMenuNavigations } from "./navigations.js";
import { initProductOrdersDrawers } from "./drawer.js";

function initNotificationState() {
  const raw = localStorage.getItem("tp_unread_notifications");
  const unread = Number.parseInt(raw || "0", 10);
  const unreadCount = Number.isFinite(unread) && unread > 0 ? unread : 0;

  document
    .querySelectorAll("[data-notification-button], [data-mobile-notification]")
    .forEach((btn) => {
      btn.setAttribute("data-has-new", unreadCount > 0 ? "true" : "false");
    });

  document.querySelectorAll("[data-notification-badge]").forEach((badge) => {
    badge.textContent = String(unreadCount);
    badge.classList.toggle("hidden", unreadCount <= 0);
  });
}

function revealProductsDashboard() {
  const skeleton = document.getElementById("products-loading-skeleton");
  const dashboard = document.getElementById("products-dashboard");
  if (!skeleton || !dashboard) return;
  window.setTimeout(() => {
    skeleton.classList.add("hidden");
    skeleton.setAttribute("aria-hidden", "true");
    dashboard.classList.remove("hidden");
    dashboard.setAttribute("aria-hidden", "false");
  }, 650);
}

/**
 * Product Management page shell: auth, nav injection, profile labels, logout.
 * POS/cart logic intentionally deferred.
 */
export async function initProductsPage() {
  const status = await auth.isAuthenticated();
  if (!status.authenticated) {
    sessionStorage.setItem("tp_auth_notice", "Please log in to access products");
    window.location.replace("/index.html");
    return;
  }

  await initMenuNavigations();

  const refreshed = await auth.fetchUserProfile(status.user || {});
  const user = refreshed.success ? refreshed.user || {} : status.user || {};
  const nameEl = document.getElementById("user-full-name");
  const roleEl = document.getElementById("user-role");
  const profileEl = document.getElementById("user-profile-image");
  const summaryNameEls = document.querySelectorAll("[data-user-full-name]");
  const summaryEmailEls = document.querySelectorAll("[data-user-email]");
  const summaryAvatarEls = document.querySelectorAll("[data-user-avatar]");

  const fullName = user.full_name || "TindaPamilya User";
  const email = user.email || "user@email.com";

  if (nameEl) nameEl.textContent = fullName;
  if (roleEl) roleEl.textContent = `Role: ${user.role || "Seller"}`;

  summaryNameEls.forEach((el) => {
    el.textContent = fullName;
  });
  summaryEmailEls.forEach((el) => {
    el.textContent = email;
  });

  if (user.profile_image) {
    if (profileEl) profileEl.src = user.profile_image;
    summaryAvatarEls.forEach((el) => {
      if (el instanceof HTMLImageElement) el.src = user.profile_image;
    });
  }

  initNotificationState();
  revealProductsDashboard();
  initProductOrdersDrawers();

  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await auth.logout();
      sessionStorage.setItem(
        "tp_auth_notice",
        JSON.stringify({
          message: "You have been logged out",
          variant: "success",
        }),
      );
      window.location.replace("/index.html");
    });
  }
}
