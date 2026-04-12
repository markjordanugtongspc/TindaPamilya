import * as auth from "./auth.js";
import { initMenuNavigations } from "./navigations.js";
import { initMenuKpiAnimations, toggleKpiSkeleton as kpiSkeleton } from "./animations.js";
import { formatPeso, renderProductCard, GLOBAL_PRODUCTS } from "./products.js";
import { initDrawers } from "./drawer.js";
import { productCartManager } from "./add-to-cart.js";

function initStoreClock() {
  const clockEl = document.getElementById("tp-pos-clock");
  const dateEl = document.getElementById("tp-pos-date");
  if (!clockEl || !dateEl) return;

  const tick = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hhmm = `${String(hours).padStart(2, "0")}:${minutes}`;

    clockEl.innerHTML = `${hhmm}<span id="tp-pos-seconds" class="text-sm font-medium text-red-500/60">${seconds}s</span> <span class="text-xs uppercase ml-0.5 font-bold opacity-70">${ampm}</span>`;

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

function initProductCarouselLogic() {
  const root = document.getElementById("tp-menu-product-sales-carousel");
  if (!root) return;
  const track = root.querySelector("[data-product-carousel-track]");
  const dotsContainer = root.querySelector("#tp-product-carousel-dots");
  const prev = root.querySelector("[data-product-carousel-prev]");
  const next = root.querySelector("[data-product-carousel-next]");
  if (!track || !dotsContainer) return;

  const slides = Array.from(track.children);
  if (slides.length <= 1) {
    if (prev) prev.style.display = "none";
    if (next) next.style.display = "none";
    dotsContainer.innerHTML = "";
    return;
  }

  dotsContainer.innerHTML = slides.map((_, i) => `
    <button type="button" data-product-slide-to="${i}" class="h-2 w-2 cursor-pointer rounded-full ${i === 0 ? "bg-primary" : "bg-text/20"}" aria-label="Go to slide ${i+1}"></button>
  `).join("");

  const dots = Array.from(dotsContainer.querySelectorAll("[data-product-slide-to]"));
  let index = 0;

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle("bg-primary", i === index);
      dot.classList.toggle("bg-text/20", i !== index);
    });
  };

  prev?.addEventListener("click", () => {
    index = index <= 0 ? slides.length - 1 : index - 1;
    render();
  });

  next?.addEventListener("click", () => {
    index = index >= slides.length - 1 ? 0 : index + 1;
    render();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      index = i;
      render();
    });
  });
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
  const mobileTrack = document.querySelector("[data-product-carousel-track]");
  const viewAllBtn = document.getElementById("tp-menu-view-all-products");

  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
      window.location.href = "/pages/products/";
    });
  }

  // Define total budget target
  const BUDGET_TARGET = 5000;
  
  // Show skeletons for all KPI cards
  const kpiCards = document.querySelectorAll("[data-kpi-card]");
  kpiCards.forEach(card => kpiSkeleton(card, true));

  try {
    // Fetch products for latest products grid and capital/low-stock calc
    const prodRes = await fetch("/api/sales/product_api");
    const prodJson = await prodRes.json();
    let capital = 0;
    let lowStockCount = 0;
    
    if (prodJson.success && prodJson.data) {
      const data = prodJson.data;
      
      // Update the imported GLOBAL_PRODUCTS array
      GLOBAL_PRODUCTS.length = 0;
      GLOBAL_PRODUCTS.push(...data);

      data.forEach(p => {
        const qty = p.quantity || 0;
        const cost = p.purchasePrice || p.salePrice || 0;
        capital += (qty * cost);
        if (qty <= 5) lowStockCount += 1;
      });
      
      const latest = data.slice(0, 4); // Limit to 4 for desktop grid row symmetry

      // Update Desktop Grid
      if (grid) {
        grid.innerHTML = "";
        latest.forEach((product) => {
          const card = renderProductCard(product);
          if (card) {
             // Redirect to Products page with barcode param to trigger drawer there
             card.addEventListener("click", (e) => {
                const deleteBtn = e.target.closest("[data-product-delete]");
                if (deleteBtn) return; // Allow delete button to function normally
                
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/pages/products/index.html?barcode=${product.barcode}`;
             });
             grid.appendChild(card);
          }
        });
      }

      // Update Mobile Carousel (2 products per slide)
      if (mobileTrack) {
        mobileTrack.innerHTML = "";
        for (let i = 0; i < latest.length; i += 2) {
          const slide = document.createElement("div");
          slide.className = "flex min-w-full gap-3 px-1";
          
          const productsInSlide = [latest[i], latest[i + 1]];

          productsInSlide.forEach(p => {
            if (p) {
               const card = renderProductCard(p);
               if (card) {
                  card.classList.add("flex-1");
                  card.addEventListener("click", (e) => {
                     const deleteBtn = e.target.closest("[data-product-delete]");
                     if (deleteBtn) return;
                     
                     e.preventDefault();
                     e.stopPropagation();
                     window.location.href = `/pages/products/index.html?barcode=${p.barcode}`;
                  });
                  slide.appendChild(card);
               }
            } else {
               // Placeholder for empty slots to maintain layout
               const spacer = document.createElement("div");
               spacer.className = "flex-1";
               slide.appendChild(spacer);
            }
          });

          mobileTrack.appendChild(slide);
        }
        initProductCarouselLogic();
      }
    }

    // Fetch sales for KPI and Budget
    const salesRes = await fetch("/api/sales/sales_log_api");
    const salesJson = await salesRes.json();
    
    // Hide skeletons after data is ready
    kpiCards.forEach(card => kpiSkeleton(card, false));

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
    kpiCards.forEach(card => kpiSkeleton(card, false));
    console.error("Failed to fetch menu data", err);
  }
}

function initStoreStatusToggle() {
  const btn = document.getElementById("tp-store-toggle-btn");
  const badge = document.getElementById("tp-store-status-badge");
  const icon = document.getElementById("tp-store-toggle-icon");
  const title = document.getElementById("tp-store-toggle-title");
  const desc = document.getElementById("tp-store-toggle-desc");

  if (!btn || !badge) return;

  btn.addEventListener("click", () => {
    const isOpen = btn.dataset.storeOpen === "true";
    const newState = !isOpen;
    btn.dataset.storeOpen = String(newState);

    if (newState) {
      // Store is now OPEN
      badge.textContent = "Open";
      badge.className = "rounded-full bg-emerald-500/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-600 ring-1 ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-400";
      
      title.textContent = "End of day";
      title.className = "block text-sm font-bold text-rose-900 dark:text-rose-100";
      
      desc.textContent = "Close & report";
      desc.className = "mt-0.5 block text-xs text-rose-900/70 dark:text-rose-100/75";

      btn.className = "group flex cursor-pointer flex-col items-start gap-3 rounded-tl-none rounded-2xl border border-rose-300/35 bg-rose-100/75 p-4 text-left shadow-sm ring-1 ring-rose-400/20 transition hover:-translate-y-0.5 hover:bg-rose-100 dark:bg-rose-300/20 dark:hover:bg-rose-300/30";
      
      icon.src = "/assets/svg/store-close.svg";
      icon.className = "h-7 w-7 transition-all duration-300 group-hover:scale-110 rose-filter";
    } else {
      // Store is now CLOSED
      badge.textContent = "Closed";
      badge.className = "rounded-full bg-red-500/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-red-600 ring-1 ring-red-500/25 dark:bg-red-500/20 dark:text-red-400";
      
      title.textContent = "Open Store";
      title.className = "block text-sm font-bold text-emerald-900 dark:text-emerald-100";
      
      desc.textContent = "Resume register";
      desc.className = "mt-0.5 block text-xs text-emerald-900/70 dark:text-emerald-100/75";

      btn.className = "group flex cursor-pointer flex-col items-start gap-3 rounded-tl-none rounded-2xl border border-emerald-300/35 bg-emerald-100/75 p-4 text-left shadow-sm ring-1 ring-emerald-400/20 transition hover:-translate-y-0.5 hover:bg-emerald-100 dark:bg-emerald-300/20 dark:hover:bg-emerald-300/30";
      
      icon.src = "/assets/svg/store-open.svg";
      icon.className = "h-7 w-7 transition-all duration-300 group-hover:scale-110 emerald-filter";
    }
  });
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
  const username = user.username || "user";

  if (nameEl) nameEl.textContent = fullName;
  if (roleEl) roleEl.textContent = user.role || "Seller";

  document.querySelectorAll("[data-user-username]").forEach((el) => {
    el.textContent = username;
  });
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
  initStoreStatusToggle();
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
