import { initSidebarHamburgerAnimation } from "./animations.js";

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

function applyActiveState() {
  const active = "menu";
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

  initDesktopSidebar();
  initLogoRefresh();
  applyActiveState();
  injectVersionLabels();
}
