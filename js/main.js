import "../styles/tailwind.css";
import { initDarkMode } from "./modules/darkmode.js";
import {
  initFormAnimations,
  initProductImageZoom,
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
import { initBarcodeScanner } from "./modules/barcode-scanner.js";

const DEV_DEBUG = false;
const APP_VERSION = "0.5.70";
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

const LOGIN_SUCCESS_GATES_MS = 1450;

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
    overlay.classList.add("tp-login-success--gates-open");
  });

  window.setTimeout(() => {
    window.location.href = href;
  }, LOGIN_SUCCESS_GATES_MS + 400);
}

const LOADING_SVG = `
<div role="status" class="flex items-center justify-center">
    <svg aria-hidden="true" class="w-7 h-7 animate-spin fill-white" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="white" opacity="0.2"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
    </svg>
    <span class="sr-only">Loading...</span>
</div>`;

const SUCCESS_SVG = `
<div class="flex items-center justify-center animate-tp-success-check-in">
    <svg class="w-8 h-8 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.5 11.5 11 14l4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
    </svg>
</div>`;

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

  const loginBtn = document.getElementById("login-btn");
  const loginBtnText = document.getElementById("login-btn-text");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginInlineError("");

    const originalContent = loginBtn ? loginBtn.innerHTML : "LOG IN";
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = LOADING_SVG;
    }

    const email = emailInput?.value?.trim() || "";
    const password = passwordInput?.value || "";
    const remember = Boolean(savePasswordEl?.checked);

    const result = await auth.login(email, password);

    if (!result.success) {
      setLoginInlineError(result.error || "Wrong email or password");
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalContent;
      }
      return;
    }

    if (loginBtn) {
      loginBtn.innerHTML = SUCCESS_SVG;
    }

    // Give it a brief moment so the user sees the button checkmark pop in
    await new Promise((r) => setTimeout(r, 650));

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
    .then(() => {
      debugLog("initProductsPage: OK");
      initProductImageZoom();
    })
    .catch((error) => console.error("initProductsPage failed", error));
} else {
  ensureLoginPageVisibleFallback();
  handleLoginPage()
    .then(() => debugLog("handleLoginPage: OK"))
    .catch((error) => console.error("handleLoginPage failed", error));
}
safeInit("initFlowbite", () => initFlowbite());
safeInit("initBarcodeScanner", () => initBarcodeScanner());
