import { initSidebarHamburgerAnimation } from "./animations.js";
import { applyRBACUI } from "./rbac.js";

async function injectComponent(targetId, url) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const response = await fetch(url);
  if (!response.ok) return;
  target.innerHTML = await response.text();
}

function setSidebarState(open) {
  const sidebar = document.getElementById("menu-sidebar");
  const content = document.getElementById("menu-content");
  if (!sidebar || !content) return;

  sidebar.classList.toggle("translate-x-0", open);
  sidebar.classList.toggle("-translate-x-full", !open);
  sidebar.setAttribute("aria-hidden", String(!open));
  content.classList.toggle("lg:ml-64", open);
  content.classList.toggle("lg:ml-6", !open);
  content.classList.toggle("lg:max-w-[calc(100vw-18rem)]", open);
  content.classList.toggle("lg:max-w-[calc(100vw-2rem)]", !open);
}

function initDesktopSidebar() {
  const toggle = document.getElementById("menu-sidebar-toggle");
  if (!toggle) return;
  const desktop = window.matchMedia("(min-width: 1024px)");
  let desktopOpen = true;

  const syncWithViewport = (matches) => {
    if (!matches) {
      desktopOpen = false;
      setSidebarState(false);
      return;
    }
    desktopOpen = true;
    setSidebarState(true);
  };

  syncWithViewport(desktop.matches);
  initSidebarHamburgerAnimation(toggle, (open) => {
    if (!desktop.matches) return;
    desktopOpen = open;
    setSidebarState(open);
  });
  desktop.addEventListener("change", (event) => {
    syncWithViewport(event.matches);
  });
}

function initLogoRefresh() {
  document.querySelectorAll("[data-menu-logo]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.reload();
    });
  });
}

/** Mobile bottom bar: navigate for primary routes (buttons are not links). */
function initBottomNavRoutes() {
  const routes = {
    menu: "/pages/menu/",
    products: "/pages/products/",
    sellers: "/pages/sellers/",
  };
  document.querySelectorAll("[data-bottom-nav-link]").forEach((el) => {
    const key = el.getAttribute("data-bottom-nav-link");
    const href = key ? routes[key] : undefined;
    if (!href) return;
    el.addEventListener("click", () => {
      window.location.href = href;
    });
  });
}

function applyActiveState() {
  const path = window.location.pathname.replace(/\/index\.html$/, "/");
  let active = "menu";
  if (path.includes("/pages/products")) active = "products";
  if (path.includes("/pages/sellers")) active = "sellers";

  document.querySelectorAll("[data-nav-link], [data-bottom-nav-link]").forEach((el) => {
    const key = el.getAttribute("data-nav-link") || el.getAttribute("data-bottom-nav-link");
    if (key === active) {
      el.classList.add("is-active-nav");
    } else {
      el.classList.remove("is-active-nav");
    }
  });
}

function injectVersionLabels() {
  const version = document.documentElement.dataset.tpVersion;
  
  // Read username from auth session
  let username = "User";
  const rawAuth = localStorage.getItem("tp_auth_session");
  if (rawAuth) {
    try {
      const user = JSON.parse(rawAuth);
      username = user.username || user.full_name || "User";
    } catch {}
  }
  
  document.querySelectorAll("[data-user-username]").forEach((el) => {
    el.textContent = username;
  });

  if (!version) return;
  document
    .querySelectorAll("#menu-sidebar [data-app-version], [data-auth-main] [data-app-version]")
    .forEach((el) => {
      el.textContent = `TindaPamilya v${version}`;
    });
}

export async function initMenuNavigations() {
  await Promise.all([
    injectComponent("menu-sidebar-root", "/pages/components/sidebar.html"),
    injectComponent("menu-bottom-nav-root", "/pages/components/bottom-nav.html"),
  ]);

  // Bind logout button AFTER injection
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { logout } = await import("./auth.js");
      await logout();
      window.location.href = "/";
    });
  }

  initDesktopSidebar();
  initLogoRefresh();
  initBottomNavRoutes();
  applyActiveState();
  injectVersionLabels();
  
  // Apply RBAC UI logic after injection
  await applyRBACUI();
}
