import { Drawer } from "flowbite";

const DESKTOP_MIN_WIDTH = 1024;
/** Fallback if the top bar is not in the DOM yet. */
const DESKTOP_TOP_OFFSET_FALLBACK_PX = 76;

const backdropClasses =
  "bg-black/45 fixed inset-0 z-[45] backdrop-blur-[1px] dark:bg-black/60";
const ORDERS_DRAWER_STATE_KEY = "tp_orders_drawer_restore";
const PRODUCT_INFO_DRAWER_STATE_KEY = "tp_product_info_drawer_restore";

let openDrawersCount = 0;

/**
 * Toggles visibility of mobile navigation elements to prevent UI overlap when drawers are open.
 */
function toggleMobileNavVisibility(isVisible) {
  const elements = [
    document.getElementById("tp-mobile-top-nav"),
    document.getElementById("tp-mobile-search-bar"),
    document.getElementById("tp-mobile-bottom-nav"),
  ];

  elements.forEach((el) => {
    if (!el) return;
    if (isVisible) {
      el.classList.remove("opacity-0", "pointer-events-none");
      el.classList.add("opacity-100");
    } else {
      el.classList.add("opacity-0", "pointer-events-none");
      el.classList.remove("opacity-100");
    }
  });
}

/**
 * Globally tracks open drawers and hides mobile chrome if any are active.
 */
export function updateGlobalDrawerState(isOpen) {
  if (isOpen) openDrawersCount++;
  else openDrawersCount = Math.max(0, openDrawersCount - 1);

  // Apply hiding ONLY on mobile screens
  if (window.innerWidth < DESKTOP_MIN_WIDTH) {
    toggleMobileNavVisibility(openDrawersCount === 0);
  }
}

function isDrawerVisible(drawerEl, hiddenClass) {
  return !drawerEl.classList.contains(hiddenClass);
}

function blurFocusedWithin(rootEl) {
  const active = document.activeElement;
  if (active instanceof HTMLElement && rootEl.contains(active)) {
    active.blur();
  }
}

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
export function applyRightDrawerDesktopLayout(rightEl) {
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
    onShow: () => updateGlobalDrawerState(true),
    onHide: () => updateGlobalDrawerState(false),
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

  window.addEventListener("tp:scanner-modal-open", () => {
    if (isDrawerVisible(rightEl, "translate-x-full")) {
      localStorage.setItem(ORDERS_DRAWER_STATE_KEY, "right");
      blurFocusedWithin(rightEl);
      drawerRight.hide();
      return;
    }
    if (isDrawerVisible(bottomEl, "translate-y-full")) {
      localStorage.setItem(ORDERS_DRAWER_STATE_KEY, "bottom");
      blurFocusedWithin(bottomEl);
      drawerBottom.hide();
      return;
    }
    localStorage.removeItem(ORDERS_DRAWER_STATE_KEY);
  });

  window.addEventListener("tp:scanner-modal-close", () => {
    const restore = localStorage.getItem(ORDERS_DRAWER_STATE_KEY);
    localStorage.removeItem(ORDERS_DRAWER_STATE_KEY);
    if (restore === "right" && mq.matches) drawerRight.show();
    if (restore === "bottom" && !mq.matches) drawerBottom.show();
  });

  document.querySelectorAll("[data-tp-drawer-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const which = btn.getAttribute("data-tp-drawer-close");
      if (which === "right") {
        blurFocusedWithin(rightEl);
        drawerRight.hide();
      }
      if (which === "bottom") {
        blurFocusedWithin(bottomEl);
        drawerBottom.hide();
      }
    });
  });
}

function upsertProductInfoTemplates() {
  const template = document.getElementById("tp-product-info-template");
  if (!template) return;
  document.querySelectorAll("[data-tp-product-info-mount]").forEach((mount) => {
    if (mount.childElementCount > 0) return;
    mount.appendChild(template.content.cloneNode(true));
  });
}

function setText(root, selector, value) {
  const el = root.querySelector(selector);
  if (!el) return;
  el.textContent = value;
}

function setStocksCount(root, value) {
  const el = root.querySelector("[data-pi-stocks-count]");
  if (!el) return;
  el.textContent = String(value ?? "0");
}

function initProductInfoDrawer() {
  upsertProductInfoTemplates();

  const rightEl = document.getElementById("tp-product-info-drawer-right");
  const bottomEl = document.getElementById("tp-product-info-drawer-bottom");
  if (!rightEl || !bottomEl) return;

  const drawerOpts = {
    backdrop: true,
    bodyScrolling: false,
    backdropClasses,
    onShow: () => updateGlobalDrawerState(true),
    onHide: () => updateGlobalDrawerState(false),
  };

  const drawerRight = new Drawer(
    rightEl,
    { ...drawerOpts, placement: "right" },
    { id: "tp-product-info-drawer-right", override: true },
  );
  const drawerBottom = new Drawer(
    bottomEl,
    { ...drawerOpts, placement: "bottom" },
    { id: "tp-product-info-drawer-bottom", override: true },
  );

  const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);

  applyRightDrawerDesktopLayout(rightEl);

  const open = (data) => {
    const root = mq.matches ? rightEl : bottomEl;
    const mount = root.querySelector("[data-tp-product-info-mount]");
    if (!(mount instanceof HTMLElement)) return;

    setText(mount, "[data-pi-barcode]", data.barcode || "—");
    setText(mount, "[data-pi-name]", data.name || "Product");
    setStocksCount(mount, data.quantity ?? 0);
    setText(mount, "[data-pi-category]", data.category && data.category !== "N/A" ? data.category : "—");
    setText(mount, "[data-pi-exp]", data.expirationDate && data.expirationDate !== "N/A" ? data.expirationDate : "—");
    
    // Format money if it is a number
    const purchaseVal = data.purchasePrice && !isNaN(data.purchasePrice) && data.purchasePrice > 0 ? `₱${parseFloat(data.purchasePrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";
    setText(mount, "[data-pi-purchase]", purchaseVal);
    
    const saleVal = data.salePrice && !isNaN(data.salePrice) && data.salePrice > 0 ? `₱${parseFloat(data.salePrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";
    setText(mount, "[data-pi-sale]", saleVal);
    
    setText(mount, "[data-pi-desc]", data.description && data.description !== "N/A" ? data.description : "—");
    
    // AUTO-MAX: Set quantity input to current stocks
    mount.querySelectorAll("[data-pi-qty-val]").forEach(input => {
      input.value = data.quantity ?? 1;
    });

    // Handling Image
    const cover = root.querySelector("[data-pi-cover]");
    if (cover) {
       cover.src = data.image || "/assets/img/pos-logo.png";
       if (data.image && !data.image.includes("pos-logo.png")) {
          cover.classList.remove("opacity-90");
       } else {
          cover.classList.add("opacity-90");
       }
    }

    if (mq.matches) {
      drawerBottom.hide();
      drawerRight.show();
    } else {
      drawerRight.hide();
      drawerBottom.show();
    }

    // Setup Edit Product button
    root.querySelectorAll("[data-tp-edit-product]").forEach(btn => {
      btn.onclick = () => {
         if (mq.matches) drawerRight.hide();
         else drawerBottom.hide();
         window.dispatchEvent(new CustomEvent("tp:edit-product-open", { detail: { data } }));
      };
    });

    // Emit event for other modules (like CartManager) to sync states
    window.dispatchEvent(new CustomEvent("tp:drawer-opened"));
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-product-delete]")) return;
    const card = target.closest("[data-product-card]");
    if (!(card instanceof HTMLElement)) return;

    const barcode = card.getAttribute("data-product-barcode") || "";
    const name =
      card.querySelector("[data-product-name]")?.textContent?.trim() || "";
    const sku =
      card.querySelector("[data-product-sku]")?.textContent?.trim() || "";
    const price =
      card.dataset.productSalePrice || card.querySelector("[data-product-price]")?.textContent?.trim() || "";
    // Clean up price if it has currency symbol
    const cleanPrice = price.replace(/[^\d.-]/g, '');
    const qtyRaw = card.getAttribute("data-product-quantity");
    const qty = qtyRaw ? Number.parseInt(qtyRaw, 10) : 1;

    open({
      barcode,
      name,
      quantity: Number.isFinite(qty) ? qty : 1,
      category: card.dataset.productCategory || "—",
      expirationDate: card.dataset.productExpiration || "—",
      salePrice: cleanPrice || "0",
      purchasePrice: card.dataset.productPurchase || "0",
      description: card.dataset.productDescription || "—",
      image: card.dataset.productImage || null,
      sku,
    });
  });

  document.querySelectorAll("[data-tp-product-info-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const which = btn.getAttribute("data-tp-product-info-close");
      if (which === "right") {
        blurFocusedWithin(rightEl);
        drawerRight.hide();
      }
      if (which === "bottom") {
        blurFocusedWithin(bottomEl);
        drawerBottom.hide();
      }
    });
  });

  window.addEventListener("tp:scanner-modal-open", () => {
    if (isDrawerVisible(rightEl, "translate-x-full")) {
      localStorage.setItem(PRODUCT_INFO_DRAWER_STATE_KEY, "right");
      blurFocusedWithin(rightEl);
      drawerRight.hide();
      return;
    }
    if (isDrawerVisible(bottomEl, "translate-y-full")) {
      localStorage.setItem(PRODUCT_INFO_DRAWER_STATE_KEY, "bottom");
      blurFocusedWithin(bottomEl);
      drawerBottom.hide();
      return;
    }
    localStorage.removeItem(PRODUCT_INFO_DRAWER_STATE_KEY);
  });

  window.addEventListener("tp:scanner-modal-close", () => {
    const restore = localStorage.getItem(PRODUCT_INFO_DRAWER_STATE_KEY);
    localStorage.removeItem(PRODUCT_INFO_DRAWER_STATE_KEY);
    if (restore === "right" && mq.matches) drawerRight.show();
    if (restore === "bottom" && !mq.matches) drawerBottom.show();
  });
}

export function initProductInfoDrawers() {
  initProductInfoDrawer();
}

/**
 * Receipt Drawer Initialization
 */
function upsertReceiptTemplates() {
  const template = document.getElementById("tp-receipt-template-source");
  if (!template) return;
  document.querySelectorAll("[data-tp-receipt-mount]").forEach((mount) => {
    if (mount.childElementCount > 0) return;
    mount.appendChild(template.content.cloneNode(true));
  });
}

export function initReceiptDrawers() {
  upsertReceiptTemplates();

  const rightEl = document.getElementById("tp-receipt-drawer-right");
  const bottomEl = document.getElementById("tp-receipt-drawer-bottom");
  if (!rightEl || !bottomEl) return;

  const drawerOpts = {
    backdrop: true,
    bodyScrolling: false,
    backdropClasses,
    onShow: () => updateGlobalDrawerState(true),
    onHide: () => updateGlobalDrawerState(false),
  };

  const drawerRight = new Drawer(
    rightEl,
    { ...drawerOpts, placement: "right" },
    { id: "tp-receipt-drawer-right", override: true }
  );
  const drawerBottom = new Drawer(
    bottomEl,
    { ...drawerOpts, placement: "bottom" },
    { id: "tp-receipt-drawer-bottom", override: true }
  );

  applyRightDrawerDesktopLayout(rightEl);

  const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);

  document.querySelectorAll("[data-tp-receipt-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      drawerRight.hide();
      drawerBottom.hide();
    });
  });

  // Global listener to trigger receipt display
  window.addEventListener("tp:receipt-show", () => {
    if (mq.matches) {
      if (typeof drawerBottom?.isVisible === 'function' && drawerBottom.isVisible()) drawerBottom.hide();
      drawerRight.show();
    } else {
      if (typeof drawerRight?.isVisible === 'function' && drawerRight.isVisible()) drawerRight.hide();
      drawerBottom.show();
    }
  });
}

export function initDrawers() {
  initProductOrdersDrawers();
  initProductInfoDrawers();
  initReceiptDrawers();
}
