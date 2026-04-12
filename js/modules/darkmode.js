/**
 * Toggles `class="dark"` on `<html>` (persisted). Raster form icons use
 * `data-form-icon`; their light appearance in dark mode is styled in
 * `styles/tailwind.css` (`.dark img[data-form-icon]`).
 * Theme is stored in cookies + localStorage via `db-manager.js`.
 */
import { getThemePreference, setThemePreference } from "./db-manager.js";



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



export function initDarkMode() {
  applyStoredTheme();
  syncToggleUi();

  // Use event delegation on document so that buttons in dynamic components (like sidebar) work immediately
  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-theme-toggle]");
    if (btn) {
      document.documentElement.classList.toggle("dark");
      const mode = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      setThemePreference(mode);
      syncToggleUi();
    }
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!getThemePreference()) {
        applyStoredTheme();
        syncToggleUi();
      }
    });
}
