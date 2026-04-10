import * as auth from "./auth.js";
import { initMenuNavigations } from "./navigations.js";
import { initMenuKpiAnimations } from "./animations.js";
import { formatPeso, renderProductCard } from "./products.js";

function initStoreClock() {
  const clockEl = document.getElementById("tp-pos-clock");
  const dateEl = document.getElementById("tp-pos-date");
  if (!clockEl || !dateEl) return;

  const tick = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    dateEl.textContent = now.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  tick();
  window.setInterval(tick, 1000);
}

function revealMenuDashboard() {
  const skeleton = document.getElementById("menu-loading-skeleton");
  const dashboard = document.getElementById("menu-dashboard");
  if (!skeleton || !dashboard) return;
  window.setTimeout(() => {
    skeleton.classList.add("hidden");
    skeleton.setAttribute("aria-hidden", "true");
    dashboard.classList.remove("hidden");
    dashboard.setAttribute("aria-hidden", "false");
  }, 650);
}

function initMobileKpiCarousel() {
  const root = document.getElementById("pos-kpi-carousel");
  if (!root) return;
  const track = root.querySelector("[data-kpi-carousel-track]");
  if (!track) return;
  const slides = Array.from(track.children);
  const dots = Array.from(root.querySelectorAll("[data-kpi-slide-to]"));
  const prev = root.querySelector("[data-kpi-carousel-prev]");
  const next = root.querySelector("[data-kpi-carousel-next]");
  if (!slides.length) return;

  let index = 0;
  const max = slides.length - 1;

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => {
      dot.setAttribute("aria-current", String(i === index));
      dot.classList.toggle("bg-primary", i === index);
      dot.classList.toggle("bg-text/25", i !== index);
    });
  };

  prev?.addEventListener("click", () => {
    index = index <= 0 ? max : index - 1;
    render();
  });

  next?.addEventListener("click", () => {
    index = index >= max ? 0 : index + 1;
    render();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      index = i;
      render();
    });
  });

  render();
}

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

async function initMenuProducts() {
  const grid = document.getElementById("tp-menu-latest-products-grid");
  const viewAllBtn = document.getElementById("tp-menu-view-all-products");

  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
      window.location.href = "/pages/products/index.html";
    });
  }

  if (!grid) return;
  grid.innerHTML = "";
  
  try {
    const res = await fetch("/api/sales/sales_log_api");
    const json = await res.json();
    if (json.success && json.recentSales) {
      json.recentSales.slice(0, 8).forEach((sale) => {
        const article = document.createElement("article");
        article.className = "overflow-hidden rounded-2xl border border-text/10 bg-secondary/90 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10";
        article.innerHTML = `
          <div class="p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-text">${sale.name}</p>
                <p class="text-xs text-text/55">Qty: ${sale.quantity}</p>
              </div>
              <p class="shrink-0 text-sm font-bold text-primary">${formatPeso(sale.total_price)}</p>
            </div>
            <p class="mt-2 text-[0.65rem] text-text/40">${new Date(sale.created_at).toLocaleString()}</p>
          </div>
        `;
        grid.appendChild(article);
      });
      
      // Update KPIs dynamically if successful
      const dailyKpi = document.querySelector('[data-kpi-daily]');
      const weeklyKpi = document.querySelector('[data-kpi-weekly]');
      const monthlyKpi = document.querySelector('[data-kpi-monthly]');
      
      if (dailyKpi) dailyKpi.textContent = formatPeso(json.stats.daily);
      if (weeklyKpi) weeklyKpi.textContent = formatPeso(json.stats.weekly);
      if (monthlyKpi) monthlyKpi.textContent = formatPeso(json.stats.monthly);
    }
  } catch(err) {
    console.error("Failed to fetch recent sales", err);
  }
}

export async function initMenuPage() {
  const status = await auth.isAuthenticated();
  if (!status.authenticated) {
    sessionStorage.setItem("tp_auth_notice", "Please log in to access the menu");
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
  initStoreClock();
  initMenuKpiAnimations();
  initMobileKpiCarousel();
  initMenuProducts();
  revealMenuDashboard();

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
