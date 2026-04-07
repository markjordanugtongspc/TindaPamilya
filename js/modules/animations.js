function initEmailIconSwap() {
  const wrap = document.querySelector("[data-email-input-wrap]");
  if (!wrap) return;

  const input = wrap.querySelector('input[type="email"]');
  const closed = wrap.querySelector("[data-email-icon-closed]");
  const open = wrap.querySelector("[data-email-icon-open]");
  if (!input || !closed || !open) return;

  const showOpen = () => {
    closed.classList.add("opacity-0");
    open.classList.remove("opacity-0");
  };

  const showClosed = () => {
    open.classList.add("opacity-0");
    closed.classList.remove("opacity-0");
  };

  input.addEventListener("focusin", showOpen);
  input.addEventListener("focusout", showClosed);
}

function initPasswordToggle() {
  const wrap = document.querySelector("[data-password-input-wrap]");
  if (!wrap) return;

  const input = wrap.querySelector("[data-password-input]");
  const btn = wrap.querySelector("[data-password-toggle]");
  const iconShow = wrap.querySelector("[data-eye-show]");
  const iconHide = wrap.querySelector("[data-eye-hide]");
  if (!input || !btn || !iconShow || !iconHide) return;

  const setRevealed = (revealed) => {
    input.type = revealed ? "text" : "password";
    btn.setAttribute("aria-pressed", String(revealed));
    btn.setAttribute(
      "title",
      revealed ? "Hide password" : "Show password",
    );
    btn.setAttribute(
      "aria-label",
      revealed ? "Hide password" : "Show password",
    );
    if (revealed) {
      iconShow.classList.add("opacity-0", "scale-90");
      iconHide.classList.remove("opacity-0", "scale-90");
    } else {
      iconHide.classList.add("opacity-0", "scale-90");
      iconShow.classList.remove("opacity-0", "scale-90");
    }
  };

  setRevealed(false);

  btn.addEventListener("click", () => {
    setRevealed(input.type === "password");
  });
}

function initMobileIntroSequence() {
  const splash = document.querySelector("[data-intro-splash]");
  const authMain = document.querySelector("[data-auth-main]");
  const introLogo = document.querySelector("[data-intro-logo]");
  const typingText = document.querySelector("[data-intro-typing]");
  if (!splash || !authMain) return;

  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (isDesktop || prefersReducedMotion) {
    splash.classList.add("hidden");
    authMain.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    return;
  }

  if (introLogo) {
    introLogo.classList.add("-translate-x-24", "opacity-0", "scale-95");
    window.requestAnimationFrame(() => {
      introLogo.classList.remove("-translate-x-24", "opacity-0", "scale-95");
      introLogo.classList.add("animate-bounce");
    });
  }

  if (typingText) {
    const fullText = typingText.getAttribute("data-full-text") || "TindaPamilya POS";
    typingText.textContent = "";
    typingText.classList.remove("opacity-0");
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      typingText.textContent = fullText.slice(0, i);
      if (i >= fullText.length) window.clearInterval(timer);
    }, 90);
  }

  window.setTimeout(() => {
    if (introLogo) introLogo.classList.add("scale-105");
  }, 1700);

  window.setTimeout(() => {
    if (introLogo) {
      introLogo.classList.remove("animate-bounce");
      introLogo.classList.remove("scale-105");
      introLogo.classList.add("opacity-0", "scale-110", "translate-y-2");
    }
    if (typingText) {
      typingText.classList.add("opacity-0");
    }
    splash.classList.add("opacity-0");

    window.setTimeout(() => {
      splash.classList.add("hidden");
      authMain.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    }, 650);
  }, 2900);
}

export function initFormAnimations() {
  initEmailIconSwap();
  initPasswordToggle();
  initMobileIntroSequence();
}
