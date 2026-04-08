import "../styles/tailwind.css";
import { initDarkMode } from "./modules/darkmode.js";
import {
  initFormAnimations,
  runLoginSuccessAssetLoading,
} from "./modules/animations.js";
import * as auth from "./modules/auth.js";
import { initMenuPage } from "./modules/menu.js";
import { initProductsPage } from "./modules/products.js";
import {
  saveEncryptedCredentials,
  loadEncryptedCredentials,
  clearSavedCredentials,
} from "./modules/db-manager.js";
import { initFlowbite } from "flowbite";

const DEV_DEBUG = false;
const APP_VERSION = "0.5.23";
// Use data-tp-version on <html> — NOT data-app-version — or injectAppVersionLabels would
// match <html> and setting textContent would wipe the entire document.
document.documentElement.dataset.tpVersion = APP_VERSION;

function debugLog(...args) {
  if (!DEV_DEBUG) return;
  console.log("[TP DEBUG]", ...args);
}

function injectAppVersionLabels() {
  const root = document.body;
  if (!root) {
    debugLog("injectAppVersionLabels: no document.body yet");
    return;
  }
  const labels = root.querySelectorAll(
    "[data-auth-main] [data-app-version], #menu-sidebar [data-app-version]",
  );
  labels.forEach((el) => {
    el.textContent = `TindaPamilya v${APP_VERSION}`;
  });
  debugLog("version labels injected", { count: labels.length, version: APP_VERSION });
}

function ensureLoginPageVisibleFallback() {
  const authMain = document.querySelector("[data-auth-main]");
  const splash = document.querySelector("[data-intro-splash]");
  if (!authMain) {
    debugLog("ensureLoginPageVisibleFallback skipped: no [data-auth-main]");
    return;
  }

  const forceShow = () => {
    authMain.classList.remove("opacity-0", "pointer-events-none", "translate-y-4");
    authMain.classList.add("pointer-events-auto");
    splash?.classList.add("hidden");
  };

  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  if (isDesktop) {
    debugLog("login fallback: desktop immediate force-show");
    forceShow();
  }

  window.setTimeout(() => {
    if (authMain.classList.contains("opacity-0")) {
      debugLog("login fallback: delayed force-show");
      forceShow();
    } else {
      debugLog("login fallback: auth main already visible");
    }
  }, 3600);
}

function initGlobalDebugHandlers() {
  if (!DEV_DEBUG) return;
  window.addEventListener("error", (event) => {
    console.error("[TP DEBUG] window.error", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[TP DEBUG] unhandledrejection", event.reason);
  });
}

function safeInit(label, fn) {
  try {
    fn();
    debugLog(`${label}: OK`);
  } catch (error) {
    console.error(`${label} failed`, error);
  }
}

initGlobalDebugHandlers();
safeInit("initDarkMode", () => initDarkMode());
safeInit("initFormAnimations", () => initFormAnimations());
safeInit("injectAppVersionLabels:initial", () => injectAppVersionLabels());
window.addEventListener("DOMContentLoaded", () => {
  safeInit("injectAppVersionLabels:domcontentloaded", () => injectAppVersionLabels());
  window.setTimeout(() => safeInit("injectAppVersionLabels:delayed", () => injectAppVersionLabels()), 700);
});

function showToast(message, variant = "error") {
  const old = document.getElementById("tp-toast");
  if (old) old.remove();

  const isSuccess = variant === "success";
  const toast = document.createElement("div");
  toast.id = "tp-toast";
  toast.setAttribute("role", "status");

  if (isSuccess) {
    toast.className = [
      "fixed bottom-4 right-4 z-[110] flex max-w-[min(100vw-2rem,20rem)] items-center gap-3 rounded-full border border-red-200/45 py-2.5 pl-2.5 pr-5 shadow-lg backdrop-blur-xl sm:bottom-6 sm:right-6",
      "bg-gradient-to-r from-red-50/50 to-rose-50/35 dark:border-red-400/25 dark:from-red-950/45 dark:to-red-900/35",
    ].join(" ");

    const iconWrap = document.createElement("div");
    iconWrap.className =
      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100/95 text-red-600 ring-1 ring-red-200/50 dark:bg-red-900/55 dark:text-red-300 dark:ring-red-500/25";
    iconWrap.innerHTML =
      '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>';

    const textCol = document.createElement("div");
    textCol.className = "min-w-0 flex-1";

    const eyebrow = document.createElement("p");
    eyebrow.className =
      "text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-red-500 dark:text-red-400/95";
    eyebrow.textContent = "Signed out";

    const body = document.createElement("p");
    body.className =
      "mt-0.5 text-sm font-medium leading-snug text-red-950 dark:text-red-50";
    body.textContent = message;

    textCol.appendChild(eyebrow);
    textCol.appendChild(body);
    toast.appendChild(iconWrap);
    toast.appendChild(textCol);
  } else {
    toast.className =
      "fixed inset-x-4 top-4 z-[110] mx-auto max-w-md rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg";
    toast.textContent = message;
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

const LOGIN_SUCCESS_DRAWER_MS = 1450;

function isDesktopLoginSuccessView() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

const LOGIN_SUCCESS_ROLL_MS = 720;

/**
 * max-lg: vertical drawers after load; lg+: roll-out check then left/right doors.
 */
async function playLoginSuccessOverlayThenNavigate(href) {
  const overlay = document.getElementById("login-success-overlay");
  const iconWrap = document.querySelector("[data-login-success-icon]");
  const rollTarget = document.querySelector("[data-login-success-roll-target]");
  const labelEl = document.querySelector("[data-login-loading-label]");
  const progressBarEl = document.querySelector("[data-login-progress-bar]");
  if (!overlay || !iconWrap) {
    window.location.href = href;
    return;
  }

  if (labelEl) {
    labelEl.textContent = "";
    labelEl.classList.remove(
      "font-bold",
      "uppercase",
      "tracking-[0.12em]",
      "text-emerald-600",
      "dark:text-emerald-400",
      "text-accent",
      "dark:text-accent",
    );
    labelEl.classList.add("text-gray-900", "dark:text-gray-50");
  }
  if (progressBarEl) {
    progressBarEl.style.width = "0%";
  }

  overlay.classList.remove(
    "pointer-events-none",
    "opacity-0",
    "hidden",
    "tp-login-success--drawers-open",
    "tp-login-success--gates-open",
  );
  overlay.classList.add("flex", "opacity-100", "pointer-events-auto");
  overlay.setAttribute("aria-hidden", "false");

  if (rollTarget) {
    rollTarget.classList.remove(
      "animate-tp-success-check-in",
      "animate-tp-success-check-roll-out",
    );
    void rollTarget.offsetWidth;
  }

  window.requestAnimationFrame(() => {
    iconWrap.classList.remove("opacity-0");
    rollTarget?.classList.add("animate-tp-success-check-in");
  });

  await new Promise((r) => window.setTimeout(r, 300));
  await runLoginSuccessAssetLoading({ labelEl, progressBarEl });

  const desktop = isDesktopLoginSuccessView();
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (desktop && rollTarget && !reduceMotion) {
    rollTarget.classList.remove("animate-tp-success-check-in");
    void rollTarget.offsetWidth;
    rollTarget.classList.add("animate-tp-success-check-roll-out");
    await new Promise((r) => window.setTimeout(r, LOGIN_SUCCESS_ROLL_MS));
  } else if (desktop && rollTarget) {
    rollTarget.classList.remove("animate-tp-success-check-in");
    rollTarget.classList.add("opacity-0");
  }

  window.requestAnimationFrame(() => {
    if (desktop) {
      overlay.classList.add("tp-login-success--gates-open");
    } else {
      overlay.classList.add("tp-login-success--drawers-open");
    }
  });

  window.setTimeout(() => {
    window.location.href = href;
  }, LOGIN_SUCCESS_DRAWER_MS + 400);
}

function setLoginInlineError(message = "") {
  const errorEl = document.getElementById("login-error");
  if (!errorEl) return;
  if (!message) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    return;
  }
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

async function handleLoginPage() {
  const noticeRaw = sessionStorage.getItem("tp_auth_notice");
  if (noticeRaw) {
    let notice = noticeRaw;
    let variant = "error";
    try {
      const parsed = JSON.parse(noticeRaw);
      if (parsed && typeof parsed === "object" && parsed.message) {
        notice = parsed.message;
        variant = parsed.variant === "success" ? "success" : "error";
      }
    } catch {
      /* legacy plain string */
    }
    showToast(notice, variant);
    sessionStorage.removeItem("tp_auth_notice");
  }

  const form = document.getElementById("login-form");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const savePasswordEl = document.getElementById("save-password");

  const saved = await loadEncryptedCredentials();
  if (saved && emailInput && passwordInput && savePasswordEl) {
    emailInput.value = saved.email;
    passwordInput.value = saved.password;
    savePasswordEl.checked = true;
  }

  emailInput?.addEventListener("input", () => setLoginInlineError(""));
  passwordInput?.addEventListener("input", () => setLoginInlineError(""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginInlineError("");
    const email = emailInput?.value?.trim() || "";
    const password = passwordInput?.value || "";
    const remember = Boolean(savePasswordEl?.checked);

    const result = await auth.login(email, password);
    if (!result.success) {
      setLoginInlineError(result.error || "Wrong email or password");
      return;
    }

    if (remember) {
      await saveEncryptedCredentials(email, password);
    } else {
      clearSavedCredentials();
    }

    const menuHref = "pages/menu/";
    void playLoginSuccessOverlayThenNavigate(menuHref);
  });
}

const { pathname } = window.location;
const isMenuPage =
  pathname.endsWith("/pages/menu/") || pathname.endsWith("/pages/menu/index.html");
const isProductsPage =
  pathname.endsWith("/pages/products/") || pathname.endsWith("/pages/products/index.html");
debugLog("boot route detection", { pathname, isMenuPage, isProductsPage });
if (isMenuPage) {
  initMenuPage()
    .then(() => debugLog("initMenuPage: OK"))
    .catch((error) => console.error("initMenuPage failed", error));
} else if (isProductsPage) {
  initProductsPage()
    .then(() => debugLog("initProductsPage: OK"))
    .catch((error) => console.error("initProductsPage failed", error));
} else {
  ensureLoginPageVisibleFallback();
  handleLoginPage()
    .then(() => debugLog("handleLoginPage: OK"))
    .catch((error) => console.error("handleLoginPage failed", error));
}
safeInit("initFlowbite", () => initFlowbite());
