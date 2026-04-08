import * as auth from "./auth.js";
import { initMenuNavigations } from "./navigations.js";
import { initProductOrdersDrawers, initProductInfoDrawers } from "./drawer.js";

function initNotificationState() {
  const raw = localStorage.getItem("tp_unread_notifications");
  const unread = Number.parseInt(raw || "0", 10);
  const unreadCount = Number.isFinite(unread) && unread > 0 ? unread : 0;

  document
    .querySelectorAll("[data-notification-button], [data-mobile-notification]")
    .forEach((btn) => {
      btn.setAttribute("data-has-new", unreadCount > 0 ? "true" : "false");
    });

  document.querySelectorAll("[data-notification-badge]").forEach((badge) => {
    badge.textContent = String(unreadCount);
    badge.classList.toggle("hidden", unreadCount <= 0);
  });
}

function revealProductsDashboard() {
  const skeleton = document.getElementById("products-loading-skeleton");
  const dashboard = document.getElementById("products-dashboard");
  if (!skeleton || !dashboard) return;
  window.setTimeout(() => {
    skeleton.classList.add("hidden");
    skeleton.setAttribute("aria-hidden", "true");
    dashboard.classList.remove("hidden");
    dashboard.setAttribute("aria-hidden", "false");
  }, 650);
}

const SAMPLE_PRODUCTS = [
  {
    barcode: "4800012345678",
    name: "Rice (Rice 5kg)",
    sku: "SKU-TP-001",
    category: "Dry goods & groceries",
    expirationDate: null,
    salePrice: 265.0,
    purchasePrice: null,
    description: null,
    quantity: 18,
  },
  {
    barcode: "4800123456789",
    name: "Cooking oil (1L)",
    sku: "SKU-TP-014",
    category: "Dry goods & groceries",
    expirationDate: null,
    salePrice: 145.0,
    purchasePrice: null,
    description: null,
    quantity: 24,
  },
  {
    barcode: "4800198765432",
    name: "Lucky Me Pancit Canton (Spicy)",
    sku: "SKU-TP-088",
    category: "Snacks & chips",
    expirationDate: null,
    salePrice: 15.0,
    purchasePrice: null,
    description: null,
    quantity: 120,
  },
  {
    barcode: "4800991122334",
    name: "Coca-Cola 1.5L PET",
    sku: "SKU-TP-102",
    category: "Beverages",
    expirationDate: null,
    salePrice: 75.0,
    purchasePrice: null,
    description: null,
    quantity: 36,
  },
  {
    barcode: "4800555011223",
    name: "Surf Powder (1 sachet)",
    sku: "SKU-TP-201",
    category: "Household",
    expirationDate: null,
    salePrice: 12.0,
    purchasePrice: null,
    description: null,
    quantity: 200,
  },
  {
    barcode: "4800888777666",
    name: "Battery AA (2-pack)",
    sku: "SKU-TP-310",
    category: "Household",
    expirationDate: null,
    salePrice: 35.0,
    purchasePrice: null,
    description: null,
    quantity: 45,
  },
  {
    barcode: "4800120099900",
    name: "555 Sardines (Tomato Sauce)",
    sku: "SKU-TP-322",
    category: "Dry goods & groceries",
    expirationDate: null,
    salePrice: 28.0,
    purchasePrice: null,
    description: null,
    quantity: 80,
  },
  {
    barcode: "4800010101010",
    name: "Skyflakes Crackers (10×25g)",
    sku: "SKU-TP-401",
    category: "Snacks & chips",
    expirationDate: null,
    salePrice: 42.0,
    purchasePrice: null,
    description: null,
    quantity: 60,
  },
];

function formatPeso(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱ 0.00";
  return `₱ ${n.toFixed(2)}`;
}

function getProductTemplates() {
  const card = document.getElementById("tp-product-card-template");
  const skeleton = document.getElementById("tp-product-skeleton-template");
  return { card, skeleton };
}

function renderProductCard(product) {
  const { card } = getProductTemplates();
  if (!card) return null;
  const node = card.content.firstElementChild?.cloneNode(true);
  if (!(node instanceof HTMLElement)) return null;

  node.dataset.productBarcode = product.barcode || "";
  node.dataset.productQuantity = String(product.quantity ?? "");
  node.querySelector("[data-product-name]")?.replaceChildren(document.createTextNode(product.name || "Product"));
  node.querySelector("[data-product-sku]")?.replaceChildren(document.createTextNode(product.sku || "SKU-"));
  node.querySelector("[data-product-price]")?.replaceChildren(document.createTextNode(formatPeso(product.salePrice)));
  node
    .querySelector("[data-product-stock-count]")
    ?.replaceChildren(document.createTextNode(String(product.quantity ?? 0)));

  const delBtn = node.querySelector("[data-product-delete]");
  delBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    node.remove();
  });

  return node;
}

function appendSkeletons(count = 8) {
  const { skeleton } = getProductTemplates();
  const grid = document.getElementById("tp-products-grid");
  if (!skeleton || !grid) return [];
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    const node = skeleton.content.firstElementChild?.cloneNode(true);
    if (node instanceof HTMLElement) {
      node.dataset.tpSkeleton = "true";
      grid.appendChild(node);
      nodes.push(node);
    }
  }
  return nodes;
}

function removeSkeletons(nodes) {
  nodes.forEach((n) => n.remove());
}

function initProductGrid() {
  const grid = document.getElementById("tp-products-grid");
  if (!grid) return;
  grid.innerHTML = "";
  SAMPLE_PRODUCTS.forEach((p) => {
    const card = renderProductCard(p);
    if (card) grid.appendChild(card);
  });
}

function debounce(fn, ms) {
  let t = 0;
  return (...args) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}

function initInfiniteScrollDebounced() {
  const grid = document.getElementById("tp-products-grid");
  const sentinel = document.getElementById("tp-products-infinite-sentinel");
  if (!grid || !sentinel) return;

  let loading = false;
  let page = 1;

  const loadMore = async () => {
    if (loading) return;
    loading = true;
    const skeletons = appendSkeletons(8);

    await new Promise((r) => window.setTimeout(r, 550));

    removeSkeletons(skeletons);
    for (let i = 0; i < 8; i += 1) {
      const base = SAMPLE_PRODUCTS[(page + i) % SAMPLE_PRODUCTS.length];
      const p = {
        ...base,
        barcode: `${base.barcode}-${page}-${i}`,
        sku: base.sku.replace(/\\d+$/, (m) => String(Number(m) + page + i)),
        name: `${base.name}`,
      };
      const card = renderProductCard(p);
      if (card) grid.appendChild(card);
    }

    page += 1;
    loading = false;
  };

  const debounced = debounce(() => void loadMore(), 240);

  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries.some((e) => e.isIntersecting);
      if (hit) debounced();
    },
    { root: null, threshold: 0.15, rootMargin: "220px" },
  );

  io.observe(sentinel);
}

/**
 * Product Management page shell: auth, nav injection, profile labels, logout.
 * POS/cart logic intentionally deferred.
 */
export async function initProductsPage() {
  const status = await auth.isAuthenticated();
  if (!status.authenticated) {
    sessionStorage.setItem("tp_auth_notice", "Please log in to access products");
    window.location.replace("/index.html");
    return;
  }

  await initMenuNavigations();

  const refreshed = await auth.fetchUserProfile(status.user || {});
  const user = refreshed.success ? refreshed.user || {} : status.user || {};
  const nameEl = document.getElementById("user-full-name");
  const roleEl = document.getElementById("user-role");
  const profileEl = document.getElementById("user-profile-image");
  const summaryNameEls = document.querySelectorAll("[data-user-full-name]");
  const summaryEmailEls = document.querySelectorAll("[data-user-email]");
  const summaryAvatarEls = document.querySelectorAll("[data-user-avatar]");

  const fullName = user.full_name || "TindaPamilya User";
  const email = user.email || "user@email.com";

  if (nameEl) nameEl.textContent = fullName;
  if (roleEl) roleEl.textContent = `Role: ${user.role || "Seller"}`;

  summaryNameEls.forEach((el) => {
    el.textContent = fullName;
  });
  summaryEmailEls.forEach((el) => {
    el.textContent = email;
  });

  if (user.profile_image) {
    if (profileEl) profileEl.src = user.profile_image;
    summaryAvatarEls.forEach((el) => {
      if (el instanceof HTMLImageElement) el.src = user.profile_image;
    });
  }

  initNotificationState();
  revealProductsDashboard();
  initProductOrdersDrawers();
  initProductGrid();
  initInfiniteScrollDebounced();
  initProductInfoDrawers();

  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await auth.logout();
      sessionStorage.setItem(
        "tp_auth_notice",
        JSON.stringify({
          message: "You have been logged out",
          variant: "success",
        }),
      );
      window.location.replace("/index.html");
    });
  }
}
