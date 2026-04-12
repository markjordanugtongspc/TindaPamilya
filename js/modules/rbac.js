import * as auth from "./auth.js";
import { showErrorToast } from "./modals.js";

/**
 * Initializes Route-Based Access Control
 * This should be called early for route protection
 */
export async function initRBAC() {
  const { authenticated, user } = await auth.isAuthenticated();
  if (!authenticated || !user) return;

  const role = user.role || "user";
  const isAdmin = role === "admin";

  protectRoutes(role, isAdmin);
}

/**
 * Applies RBAC to UI elements (Sidebar, Bottom Nav)
 * This MUST be called after navigation components are injected into the DOM
 */
export async function applyRBACUI() {
  const { authenticated, user } = await auth.isAuthenticated();
  if (!authenticated || !user) return;

  const role = user.role || "user";
  const isSeller = role === "seller";
  const isAdmin = role === "admin";

  applySidebarRBAC(role, isSeller, isAdmin);
  applyBottomNavRBAC(role, isSeller, isAdmin);
}

/**
 * Manipulates the Desktop Sidebar based on role
 */
function applySidebarRBAC(role, isSeller, isAdmin) {
  const navList = document.getElementById("tp-nav-list");
  if (!navList) return;

  const menuLi = navList.querySelector('[data-nav-item="menu"]');
  const productsLi = navList.querySelector('[data-nav-item="products"]');
  const sellersLi = navList.querySelector('[data-nav-item="sellers"]');

  if (isSeller) {
    // SELLER: Products first, Menu second, Sellers hidden
    if (productsLi && menuLi) {
      navList.insertBefore(productsLi, menuLi);
    }
    if (sellersLi) {
      sellersLi.remove(); // Completely remove for sellers
    }
  } else if (isAdmin) {
    // ADMIN: Menu first, Products second, Sellers third (default)
    if (menuLi && productsLi) {
      navList.insertBefore(menuLi, productsLi);
    }
    if (sellersLi && productsLi) {
      navList.insertBefore(productsLi, sellersLi);
    }
    if (sellersLi) {
      sellersLi.classList.remove("hidden");
      sellersLi.style.display = "";
    }
  } else {
    // OTHERS/USER: Default order, but hide Sellers
    if (sellersLi) {
      sellersLi.remove();
    }
  }
}

/**
 * Manipulates the Mobile Bottom Nav based on role
 */
function applyBottomNavRBAC(role, isSeller, isAdmin) {
  const bottomNav = document.getElementById("tp-mobile-bottom-nav");
  if (!bottomNav) return;

  const menuBtn = bottomNav.querySelector('[data-bottom-nav-link="menu"]');
  const productsBtn = bottomNav.querySelector('[data-bottom-nav-link="products"]');
  const sellersBtn = bottomNav.querySelector('[data-bottom-nav-link="sellers"]');

  if (isSeller) {
    if (menuBtn && productsBtn) {
      const parent = menuBtn.parentElement;
      if (parent) parent.insertBefore(productsBtn, menuBtn);
    }
    if (sellersBtn) sellersBtn.remove();
  } else if (!isAdmin) {
    if (sellersBtn) sellersBtn.remove();
  }
}

/**
 * Protects specific routes from unauthorized access
 */
function protectRoutes(role, isAdmin) {
  const { pathname } = window.location;
  
  // Rule: Only admin can access /pages/sellers/
  if (pathname.includes("/pages/sellers/") && !isAdmin) {
    showErrorToast("You are not allowed to access this page.");
    setTimeout(() => {
      window.location.href = "/pages/products/";
    }, 1500);
  }
}

/**
 * Check if the user is a seller to determine default landing page
 */
export async function isUserSeller() {
  const { authenticated, user } = await auth.isAuthenticated();
  return authenticated && user?.role === "seller";
}
