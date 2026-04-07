import "../styles/tailwind.css";
import { initDarkMode } from "./modules/darkmode.js";
import { initFormAnimations } from "./modules/animations.js";
import * as auth from "./modules/auth.js";
import { initDashboardPage } from "./modules/dashboard.js";

initDarkMode();
initFormAnimations();

function showToast(message, variant = "error") {
  const old = document.getElementById("tp-toast");
  if (old) old.remove();

  const isSuccess = variant === "success";
  const toast = document.createElement("div");
  toast.id = "tp-toast";
  toast.setAttribute("role", "status");
  toast.className = [
    "fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition",
    isSuccess
      ? "bg-green-600 text-white"
      : "bg-red-600 text-white",
  ].join(" ");
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
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
  const notice = sessionStorage.getItem("tp_auth_notice");
  if (notice) {
    showToast(notice, "error");
    sessionStorage.removeItem("tp_auth_notice");
  }

  const form = document.getElementById("login-form");
  if (!form) return;

  document.getElementById("email")?.addEventListener("input", () => setLoginInlineError(""));
  document.getElementById("password")?.addEventListener("input", () => setLoginInlineError(""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginInlineError("");
    const email = document.getElementById("email")?.value?.trim() || "";
    const password = document.getElementById("password")?.value || "";

    const result = await auth.login(email, password);
    if (!result.success) {
      setLoginInlineError(result.error || "Wrong email or password");
      return;
    }

    showToast("Login successful. Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "pages/dashboard/";
    }, 550);
  });
}

const isDashboardPage = window.location.pathname.endsWith("pages/dashboard/");
if (isDashboardPage) {
  initDashboardPage();
} else {
  handleLoginPage();
}
