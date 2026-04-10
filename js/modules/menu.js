import * as auth from "./auth.js";
import { initMenuNavigations } from "./navigations.js";
import { initMenuKpiAnimations, toggleKpiSkeleton } from "./animations.js";
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

  // Define total budget target
  const BUDGET_TARGET = 5000;
  
  // Show skeletons for all KPI cards
  const kpiCards = document.querySelectorAll("[data-kpi-card]");
  kpiCards.forEach(card => toggleKpiSkeleton(card, true));

  try {
    // Fetch products for latest products grid and capital/low-stock calc
    const prodRes = await fetch("/api/sales/product_api");
    const prodJson = await prodRes.json();
    let capital = 0;
    let lowStockCount = 0;
    
    if (prodJson.success && prodJson.data) {
      prodJson.data.forEach(p => {
        const qty = p.quantity || 0;
        const cost = p.purchasePrice || p.salePrice || 0;
        capital += (qty * cost);
        if (qty <= 5) lowStockCount += 1;
      });
      
      // Update Grid (after skeletons hidden)
      if (grid) {
        grid.innerHTML = "";
        prodJson.data.slice(0, 5).forEach((product) => {
          const card = renderProductCard(product);
          if (card) grid.appendChild(card);
        });
      }
    }

    // Fetch sales for KPI and Budget
    const salesRes = await fetch("/api/sales/sales_log_api");
    const salesJson = await salesRes.json();
    
    // Hide skeletons after data is ready
    kpiCards.forEach(card => toggleKpiSkeleton(card, false));

    // Update Capital & Low Stock
    document.querySelectorAll('[data-kpi-capital]').forEach(el => el.textContent = formatPeso(capital));
    document.querySelectorAll('[data-kpi-low-stock]').forEach(el => el.textContent = String(lowStockCount));

    if (salesJson.success && salesJson.stats) {
      // Map Sales KPIs
      document.querySelectorAll('[data-kpi-daily]').forEach(el => el.textContent = formatPeso(salesJson.stats.daily));
      document.querySelectorAll('[data-kpi-weekly]').forEach(el => el.textContent = formatPeso(salesJson.stats.weekly));
      document.querySelectorAll('[data-kpi-monthly]').forEach(el => el.textContent = formatPeso(salesJson.stats.monthly));
      document.querySelectorAll('[data-kpi-orders]').forEach(el => el.textContent = String(salesJson.stats.count || 0));
      
      document.querySelectorAll('[data-kpi-budget-sales]').forEach(el => {
         el.textContent = formatPeso(salesJson.stats.daily);
         if (salesJson.stats.daily >= BUDGET_TARGET) {
            el.classList.add("text-emerald-400");
         } else {
            el.classList.add("text-text");
         }
      });
    }

  } catch(err) {
    kpiCards.forEach(card => toggleKpiSkeleton(card, false));
    console.error("Failed to fetch menu data", err);
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
