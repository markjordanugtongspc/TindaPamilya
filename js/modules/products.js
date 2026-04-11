import { Modal, Dismiss } from "flowbite";
import * as auth from "./auth.js";
import { initMenuNavigations } from "./navigations.js";
import { initDrawers } from "./drawer.js";
import { productCartManager } from "./add-to-cart.js";
import { productManager } from "./add-product.js";
import { showSuccessToast, showErrorToast } from "./modals.js";
import { initSearchAndFilter } from "./search-filter.js";

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

export let GLOBAL_PRODUCTS = [];

export async function fetchAllProducts() {
  try {
    const res = await fetch("/api/sales/product_api");
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        GLOBAL_PRODUCTS.length = 0;
        GLOBAL_PRODUCTS.push(...json.data);

        // Extract unique categories and populate dropdowns
        const uniqueCats = Array.from(new Set(GLOBAL_PRODUCTS.map(p => p.category).filter(Boolean)));
        const filterSelect = document.getElementById("products-category");
        const drawerList = document.getElementById("tp-categories-list-ul");
        
        if (filterSelect) {
           filterSelect.innerHTML = '<option value="">All Categories</option>';
           uniqueCats.forEach(c => {
              const opt = document.createElement("option");
              opt.value = c;
              opt.textContent = c;
              filterSelect.appendChild(opt);
           });
        }

        if (drawerList) {
           drawerList.innerHTML = '';
           uniqueCats.forEach(c => {
              const li = document.createElement("li");
              li.innerHTML = `<button type="button" class="flex w-full cursor-pointer items-center px-4 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-left font-semibold" data-cat-value="${c}">${c}</button>`;
              drawerList.appendChild(li);
           });
           // Rebind bindings
           const bindEvt = new CustomEvent("tp:rebind-categories");
           window.dispatchEvent(bindEvt);
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch products", err);
  }
}


export function formatPeso(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱0.00";
  return `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProductTemplates() {
  const card = document.getElementById("tp-product-card-template");
  const skeleton = document.getElementById("tp-product-skeleton-template");
  return { card, skeleton };
}

export function renderProductCard(product, customCardTemplate = null) {
  const card = customCardTemplate || document.getElementById("tp-product-card-template");
  if (!card) return null;
  const node = card.content.firstElementChild?.cloneNode(true);
  if (!(node instanceof HTMLElement)) return null;

  node.dataset.productBarcode = product.barcode || "";
  node.dataset.productQuantity = String(product.quantity ?? "");
  node.dataset.productSalePrice = String(product.salePrice ?? 0);
  node.dataset.productPurchase = String(product.purchasePrice ?? 0);
  node.dataset.productExpiration = product.expirationDate || "";
  node.dataset.productDescription = product.description || "";
  node.dataset.productCategory = product.category || "";
  node.dataset.productImage = product.image || "";
  
  // Display name optimization: prioritize actual name, hide automatic barcode-based names (TP-NEW-)
  const displayName = product.name && !product.name.startsWith("TP-NEW-") 
    ? product.name 
    : (product.category && product.category !== "N/A" ? product.category : "Unnamed Item");
    
  node.querySelector("[data-product-name]")?.replaceChildren(document.createTextNode(displayName));
  node.querySelector("[data-product-sku]")?.replaceChildren(document.createTextNode(product.sku || "—"));
  node.querySelector("[data-product-price]")?.replaceChildren(document.createTextNode(formatPeso(product.salePrice)));
  
  // Update all instances of stock count (useful for responsive layouts with duplicated elements)
  node.querySelectorAll("[data-product-stock-count]").forEach(el => {
    el.replaceChildren(document.createTextNode(String(product.quantity ?? 0)));
  });

  const productImg = node.querySelector("[data-product-image]");
  if (productImg && product.image) {
    productImg.src = product.image;
    if (!product.image.includes("logo-store-dark.svg")) {
      // Remove all typical placeholder classes
      productImg.classList.remove("h-10", "w-10", "h-12", "w-12", "h-20", "w-20", "md:h-12", "md:w-12", "md:h-28", "md:w-28", "opacity-90", "dark:brightness-0", "dark:invert");
      // Scale to cover the container
      productImg.classList.add("h-full", "w-full", "object-cover");
    }
  }

  const delBtn = node.querySelector("[data-product-delete]");
  delBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use professional Flowbite Modal for deletion confirmation
    const modalEl = document.getElementById('tp-delete-product-modal');
    if (modalEl) {
      const confirmModal = new Modal(modalEl);
      confirmModal.show();
      
      const yesBtn = document.getElementById('tp-confirm-delete-yes');
      const noBtn = document.getElementById('tp-confirm-delete-no');
      
      const onYes = () => {
        confirmModal.hide();
        node.remove();
        showDeleteToast("Item has been deleted.");
        cleanup();
      };
      
      const onNo = () => {
        confirmModal.hide();
        cleanup();
      };
      
      const cleanup = () => {
        yesBtn.removeEventListener('click', onYes);
        noBtn.removeEventListener('click', onNo);
      };
      
      yesBtn.addEventListener('click', onYes, { once: true });
      noBtn.addEventListener('click', onNo, { once: true });
    }
  });

  return node;
}

export function showDeleteToast(message) {
  const containerId = "tp-toast-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    // Mobile: bottom-middle (above nav), Desktop: bottom-right
    // Use z-[120] to stay above modals (z-100) and drawers
    container.className = "fixed bottom-24 left-1/2 z-[120] flex -translate-x-1/2 flex-col gap-3 px-4 sm:bottom-8 sm:right-8 sm:translate-x-0 sm:left-auto sm:px-0";
    document.body.appendChild(container);
  }

  const id = `toast-danger-${Date.now()}`;
  const toastEl = document.createElement("div");
  toastEl.id = id;
  toastEl.className = "flex items-center w-full max-w-sm p-4 text-text bg-secondary rounded-2xl shadow-2xl border border-border-default dark:bg-secondary/95 dark:border-white/10 animate-tp-fade-in-up";
  toastEl.setAttribute("role", "alert");
  
  toastEl.innerHTML = `
    <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-xl dark:bg-red-500/20 dark:text-red-400">
        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>
        <span class="sr-only">Error icon</span>
    </div>
    <div class="ms-3 whitespace-nowrap text-sm font-bold">${message}</div>
    <button type="button" class="ms-auto flex items-center justify-center text-text/40 hover:text-text bg-transparent rounded-lg text-sm h-8 w-8 focus:outline-none transition-colors" data-dismiss-target="#${id}" aria-label="Close">
        <span class="sr-only">Close</span>
        <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>
    </button>
  `;

  container.appendChild(toastEl);

  // Initialize Flowbite Dismiss
  const dismiss = new Dismiss(toastEl, toastEl.querySelector(`[data-dismiss-target="#${id}"]`));

  // Auto-hide after 3.2 seconds
  setTimeout(() => {
    dismiss.hide();
  }, 3200);
}

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  // 1. Auto-open scanner if scan=true
  if (params.get('scan') === 'true') {
     const scannerTrigger = document.querySelector('[data-scanner-open="true"]');
     if (scannerTrigger) {
       // Clear the param from URL without reloading to keep it clean
       const url = new URL(window.location);
       url.searchParams.delete('scan');
       window.history.replaceState({}, '', url);
       
       // Click scanner button
       scannerTrigger.click();
     }
  }

  // Handle action parameter (e.g. ?action=add)
  if (params.get('action') === 'add') {
     const pushBtn = document.getElementById('tp-add-product-btn');
     if (pushBtn) {
       const url = new URL(window.location);
       url.searchParams.delete('action');
       window.history.replaceState({}, '', url);
       
       pushBtn.click();
     }
  }
  
  // 2. Auto-open product drawer if barcode is provided
  const barcode = params.get('barcode');
  if (barcode) {
    // We might need to wait for the grid to render
    setTimeout(() => {
      const card = document.querySelector(`[data-product-barcode="${barcode}"]`);
      if (card) {
        // Clear param
        const url = new URL(window.location);
        url.searchParams.delete('barcode');
        window.history.replaceState({}, '', url);
        
        card.click();
      }
    }, 800);
  }
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

export async function initProductGrid() {
  const grid = document.getElementById("tp-products-grid");
  if (!grid) return;
  grid.innerHTML = "";
  
  if (GLOBAL_PRODUCTS.length === 0) {
    await fetchAllProducts();
  }
  
  GLOBAL_PRODUCTS.forEach((p) => {
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
    // Since we fetch all products in fetchAllProducts() immediately right now, 
    // there's no real "next page" to fetch from an array. 
    // If we implement pagination later, we append actual new server items here.
    // For now, if all products are rendered, we stop.
    // We already rendered GLOBAL_PRODUCTS in initProductGrid().
    const currentRenderedCount = grid.querySelectorAll("[data-product-card]").length;
    if (currentRenderedCount >= GLOBAL_PRODUCTS.length) {
      if (sentinel) sentinel.style.display = "none";
      loading = false;
      return; 
    }

    const skeletons = appendSkeletons(4);
    await new Promise((r) => window.setTimeout(r, 550));
    removeSkeletons(skeletons);

    // If we paginated, we would iterate new items here.
    // E.g.
    // const newItems = GLOBAL_PRODUCTS.slice(currentRenderedCount, currentRenderedCount + 8);
    // newItems.forEach(p => { 
    //    const card = renderProductCard(p); 
    //    if (card) grid.appendChild(card);
    // });
    
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
  initDrawers();
  await fetchAllProducts();
  await initProductGrid();
  initInfiniteScrollDebounced();
  initSearchAndFilter();
  handleUrlParams();

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
