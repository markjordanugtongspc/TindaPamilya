import { Drawer } from "flowbite";

const DESKTOP_MIN_WIDTH = 1024;
/** Fallback if the top bar is not in the DOM yet. */
const DESKTOP_TOP_OFFSET_FALLBACK_PX = 76;

const backdropClasses =
  "bg-black/45 fixed inset-0 z-[45] backdrop-blur-[1px] dark:bg-black/60";

function measureTopBarHeightPx() {
  const nav = document.querySelector("nav.fixed.top-0.z-50");
  if (nav instanceof HTMLElement) {
    return Math.round(nav.getBoundingClientRect().height);
  }
  return DESKTOP_TOP_OFFSET_FALLBACK_PX;
}

/**
 * Pins the right drawer flush under the measured top nav (no extra gap), full remaining height.
 * Cleared on &lt; lg where the bottom sheet is used instead.
 */
function applyRightDrawerDesktopLayout(rightEl) {
  const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
  const apply = () => {
    if (mq.matches) {
      const topPx = measureTopBarHeightPx();
      rightEl.style.top = `${topPx}px`;
      rightEl.style.height = `calc(100vh - ${topPx}px)`;
      rightEl.style.maxHeight = `calc(100vh - ${topPx}px)`;
    } else {
      rightEl.style.removeProperty("top");
      rightEl.style.removeProperty("height");
      rightEl.style.removeProperty("max-height");
    }
  };
  mq.addEventListener("change", apply);
  window.addEventListener("resize", apply);
  apply();
  window.requestAnimationFrame(() => apply());
}

function mountCartTemplate() {
  const template = document.getElementById("tp-cart-drawer-template");
  if (!template) return;
  document.querySelectorAll("[data-tp-cart-mount]").forEach((mount) => {
    if (mount.childElementCount > 0) return;
    mount.appendChild(template.content.cloneNode(true));
  });
}

/**
 * Flowbite drawers: orders cart as right panel (lg+) and bottom sheet (&lt; lg).
 * Trigger: #tp-view-orders-btn. Close buttons use [data-tp-drawer-close].
 */
export function initProductOrdersDrawers() {
  mountCartTemplate();

  const rightEl = document.getElementById("tp-orders-drawer-right");
  const bottomEl = document.getElementById("tp-orders-drawer-bottom");
  const viewBtn = document.getElementById("tp-view-orders-btn");

  if (!rightEl || !bottomEl) return;

  const drawerOpts = {
    backdrop: true,
    bodyScrolling: false,
    backdropClasses,
  };

  const drawerRight = new Drawer(
    rightEl,
    { ...drawerOpts, placement: "right" },
    { id: "tp-orders-drawer-right", override: true },
  );

  const drawerBottom = new Drawer(
    bottomEl,
    { ...drawerOpts, placement: "bottom" },
    { id: "tp-orders-drawer-bottom", override: true },
  );

  applyRightDrawerDesktopLayout(rightEl);

  const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);

  function openOrdersDrawer() {
    if (mq.matches) {
      drawerBottom.hide();
      drawerRight.show();
    } else {
      drawerRight.hide();
      drawerBottom.show();
    }
  }

  viewBtn?.addEventListener("click", openOrdersDrawer);

  document.querySelectorAll("[data-tp-drawer-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const which = btn.getAttribute("data-tp-drawer-close");
      if (which === "right") drawerRight.hide();
      if (which === "bottom") drawerBottom.hide();
    });
  });
}
