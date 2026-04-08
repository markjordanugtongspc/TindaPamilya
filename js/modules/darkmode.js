/**
 * Toggles `class="dark"` on `<html>` (persisted). Raster form icons use
 * `data-form-icon`; their light appearance in dark mode is styled in
 * `styles/tailwind.css` (`.dark img[data-form-icon]`).
 * Theme is stored in cookies + localStorage via `db-manager.js`.
 */
import { getThemePreference, setThemePreference } from "./db-manager.js";

const LOGO_LIGHT_MODE_SRC = "/assets/svg/logo-store-dark.svg";
const LOGO_DARK_MODE_SRC = "/assets/svg/logo-store-light.svg";

function applyStoredTheme() {
  const root = document.documentElement;
  const stored = getThemePreference();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (stored === "dark" || (!stored && prefersDark)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function syncToggleUi() {
  const isDark = document.documentElement.classList.contains("dark");
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(isDark));
    btn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
  });
}

function syncLogos() {
  const isDark = document.documentElement.classList.contains("dark");
  document.querySelectorAll("[data-logo-theme]").forEach((img) => {
    img.setAttribute("src", isDark ? LOGO_DARK_MODE_SRC : LOGO_LIGHT_MODE_SRC);
  });
}

export function initDarkMode() {
  applyStoredTheme();
  syncToggleUi();
  syncLogos();

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
      const mode = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      setThemePreference(mode);
      syncToggleUi();
      syncLogos();
    });
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!getThemePreference()) {
        applyStoredTheme();
        syncToggleUi();
        syncLogos();
      }
    });
}
