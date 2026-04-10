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

/**
 * POS-style sync line + progress bar under the login success check.
 * @param {{ labelEl: HTMLElement | null; progressBarEl?: HTMLElement | null; onComplete?: () => void }} opts
 * @returns {Promise<void>}
 */
export function runLoginSuccessAssetLoading(opts) {
  const labelEl = opts.labelEl;
  const progressBarEl = opts.progressBarEl ?? null;
  if (!labelEl) {
    opts.onComplete?.();
    return Promise.resolve();
  }

  const setBar = (pct) => {
    if (progressBarEl) progressBarEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    labelEl.textContent = "SUCCESS LOGGING IN";
    labelEl.classList.remove("text-gray-900", "dark:text-gray-50");
    labelEl.classList.add(
      "font-bold",
      "uppercase",
      "tracking-[0.12em]",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
    setBar(100);
    opts.onComplete?.();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let progress = 0;
    const tick = () => {
      const bump = 2 + Math.random() * 9;
      progress = Math.min(100, progress + bump);
      const n = Math.floor(progress);
      labelEl.textContent = `Syncing workspace… ${n}%`;
      labelEl.classList.add("text-gray-900", "dark:text-gray-50");
      labelEl.classList.remove(
        "font-bold",
        "uppercase",
        "tracking-[0.12em]",
        "text-emerald-600",
        "dark:text-emerald-400",
      );
      setBar(n);
      if (progress >= 100) {
        window.setTimeout(() => {
          labelEl.textContent = "SUCCESS LOGGING IN";
          labelEl.classList.remove("text-gray-900", "dark:text-gray-50");
          labelEl.classList.add(
            "font-bold",
            "uppercase",
            "tracking-[0.12em]",
            "text-emerald-600",
            "dark:text-emerald-400",
          );
          setBar(100);
          opts.onComplete?.();
          resolve();
        }, 200);
        return;
      }
      window.setTimeout(tick, 60 + Math.random() * 70);
    };
    labelEl.textContent = "Syncing workspace… 0%";
    setBar(0);
    window.setTimeout(tick, 90);
  });
}

// -----------------------------------------------------------------------------
// Navigation animations
// -----------------------------------------------------------------------------
/**
 * Animated hamburger icon for sidebar toggle.
 * @param {HTMLButtonElement | null} button
 * @param {(open: boolean) => void} [onToggle]
 */
export function initSidebarHamburgerAnimation(button, onToggle) {
  if (!button) return;
  const top = button.querySelector("[data-hb-top]");
  const mid = button.querySelector("[data-hb-mid]");
  const bot = button.querySelector("[data-hb-bot]");
  if (!top || !mid || !bot) return;

  [top, mid, bot].forEach((line) => {
    line.style.transition =
      "transform 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease";
    line.style.transformOrigin = "50% 50%";
  });

  let open = false;
  const render = () => {
    top.style.transform = open ? "translateY(5px) rotate(45deg)" : "";
    mid.style.opacity = open ? "0" : "1";
    bot.style.transform = open ? "translateY(-5px) rotate(-45deg)" : "";
    button.setAttribute("aria-pressed", String(open));
  };

  button.addEventListener("click", () => {
    open = !open;
    render();
    onToggle?.(open);
  });

  render();
}

export function initFormAnimations() {
  initEmailIconSwap();
  initPasswordToggle();
  initMobileIntroSequence();
}

export function initMenuKpiAnimations() {
  document.querySelectorAll("[data-kpi-trend-icon='up']").forEach((icon) => {
    icon.classList.add("animate-pulse");
  });
  document.querySelectorAll("[data-kpi-trend-icon='down']").forEach((icon) => {
    icon.classList.add("animate-pulse");
  });
}

/**
 * Handles the click to zoom functionality for product images.
 */
export function initProductImageZoom() {
  const modal = document.getElementById("tp-image-zoom-modal");
  const modalContent = document.getElementById("tp-image-zoom-content");
  const closeBtn = document.getElementById("tp-image-zoom-close");

  if (!modal || !modalContent || !closeBtn) return;

  const showZoom = (src) => {
    modalContent.src = src;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    // Trigger opacity after removal of hidden to allow transition
    window.requestAnimationFrame(() => {
      modal.classList.add("is-open", "opacity-100");
    });
    document.body.classList.add("overflow-hidden");
  };

  const closeZoom = () => {
    modal.classList.remove("is-open", "opacity-100");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      modalContent.src = "";
    }, 300);
    document.body.classList.remove("overflow-hidden");
  };

  // Delegate click for zoomable images
  document.addEventListener("click", (e) => {
    const zoomable = e.target.closest("[data-pi-zoomable]");
    if (zoomable && zoomable.tagName === "IMG") {
      showZoom(zoomable.src);
    }
  });

  closeBtn.addEventListener("click", closeZoom);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeZoom();
  });

  // Handle ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeZoom();
    }
  });
}
