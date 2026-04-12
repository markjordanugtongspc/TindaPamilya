import * as auth from "./auth.js";
import { formatPeso, GLOBAL_PRODUCTS } from "./products.js";
import { showSuccessToast, showErrorToast } from "./modals.js";


export class CartManager {
  constructor() {
    this.items = [];
    this.init();
    console.log("CartManager: Initialized");
  }

  init() {
    this.bindScanner();
    this.bindAddToCart();
    this.bindReceiptClose();
  }

  bindScanner() {
    window.addEventListener("tp:barcode-scanned", (e) => {
      const barcode = (e.detail.barcode || "").trim();
      if (!barcode) return;

      // Handle simple scan in desktop POS if it's visible
      const desktopSearch = document.getElementById("products-search-input");
      if (desktopSearch && document.body.contains(desktopSearch)) {
         if (window.location.pathname.includes("/products/")) {
            desktopSearch.value = barcode;
            desktopSearch.dispatchEvent(new Event("input", { bubbles: true }));
            return; // Skip POS logic
         }
      }

      const product = GLOBAL_PRODUCTS.find(p => p.barcode === barcode);
      
      if (product) {
        showSuccessToast("Found: " + product.name);
        this.addItem({
          barcode: product.barcode,
          name: product.name,
          price: product.salePrice,
          quantity: 1
        });

        // Automatically open the Orders drawer to show the cart
        setTimeout(() => {
           document.getElementById("tp-view-orders-btn")?.click();
        }, 300);
      } else {
        showErrorToast("Not Found: " + barcode);
      }
    });
  }

  bindAddToCart() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tp-add-to-cart]");
      if (!btn || btn.disabled) return;
      
      const drawer = btn.closest("[data-tp-product-info-mount]");
      if (!drawer) return;

      const barcode = (drawer.querySelector("[data-pi-barcode]")?.textContent || "").trim();
      const name = (drawer.querySelector("[data-pi-name]")?.textContent || "").trim();
      const priceStr = drawer.querySelector("[data-pi-sale]")?.textContent || "0";
      const price = parseFloat(priceStr.replace(/[^0-9.-]+/g,"")) || 0;
      const qtyInput = drawer.querySelector("[data-pi-qty-val]");
      const qty = parseInt(qtyInput?.value, 10) || 0;

      if (qty <= 0) {
         showErrorToast("Please select at least 1 item.");
         return;
      }

      const success = this.addItem({ barcode, name, price, quantity: qty });
      
      if (success) {
        // Reset qty inputs in drawer 
        const qtyInputs = drawer.querySelectorAll("[data-pi-qty-val]");
        qtyInputs.forEach(input => {
          input.value = "1";
        });
        this.syncDrawerPlusState(drawer);
        
        showSuccessToast(`${qty} ${name} added to cart.`);
        
        // Close the product info drawer
        document.querySelectorAll("[data-tp-product-info-close]").forEach((btn) => {
           btn.click();
        });
      }
    });

    document.addEventListener("input", (e) => {
       const triggeredInput = e.target.closest("[data-pi-qty-val]");
       if (triggeredInput) {
          const container = triggeredInput.closest("[data-tp-product-info-mount]");
          const barcode = (container.querySelector("[data-pi-barcode]")?.textContent || "").trim();
          const stockProduct = GLOBAL_PRODUCTS.find(p => p.barcode === barcode);
          
          let val = parseInt(triggeredInput.value, 10);
          if (isNaN(val)) val = 0;
          
          const max = stockProduct ? stockProduct.quantity : 0;
          if (val > max) {
             val = max;
             showErrorToast(`Limit reached: Only ${max} in stock`);
          } else if (val < 0) {
             val = 0;
          }
          
          const allInputs = container.querySelectorAll("[data-pi-qty-val]");
          allInputs.forEach(input => {
             input.value = val;
          });
          
          if (container) this.syncDrawerPlusState(container);
       }
    });

    document.addEventListener("click", (e) => {
       const plus = e.target.closest("[data-pi-qty-plus]");
       const minus = e.target.closest("[data-pi-qty-minus]");
       if (plus || minus) {
          const container = (plus || minus).closest("[data-tp-product-info-mount]");
          const input = container.querySelector("[data-pi-qty-val]");
          const barcode = (container.querySelector("[data-pi-barcode]")?.textContent || "").trim();
          const stockProduct = GLOBAL_PRODUCTS.find(p => p.barcode === barcode);
          
          let val = parseInt(input.value, 10) || 0;
          const max = stockProduct ? stockProduct.quantity : 0;

          if (plus) {
             if (val < max) val++;
             else showErrorToast(`Limit reached: ${max} in stock`);
          } else if (minus) {
             if (val > 1) val--;
          }

          const allInputs = container.querySelectorAll("[data-pi-qty-val]");
          allInputs.forEach(i => i.value = val);
          
          this.syncDrawerPlusState(container);
       }
    });

    window.addEventListener("tp:drawer-opened", (e) => {
      const right = document.getElementById("tp-product-info-drawer-right");
      const bottom = document.getElementById("tp-product-info-drawer-bottom");
      if (right) this.syncDrawerPlusState(right);
      if (bottom) this.syncDrawerPlusState(bottom);
    });
  }

  syncDrawerPlusState(container) {
    if (!container) return;
    const barcodeEl = container.querySelector("[data-pi-barcode]");
    const barcode = (barcodeEl?.textContent || "").trim();
    const stockProduct = GLOBAL_PRODUCTS.find(p => p.barcode === barcode);
    const qtyInputs = container.querySelectorAll("[data-pi-qty-val]");
    const plusBtns = container.querySelectorAll("[data-pi-qty-plus]");

    if (qtyInputs.length > 0 && stockProduct) {
        const v = parseInt(qtyInputs[0].value, 10) || 0;
        const max = stockProduct.quantity || 0;
        
        plusBtns.forEach(btn => {
           const isDisabled = v >= parseInt(max, 10) || max <= 0;
           btn.disabled = isDisabled;
           
           if (isDisabled) {
             btn.classList.remove("bg-primary", "text-white", "hover:bg-accent");
             btn.classList.add("bg-gray-100", "text-gray-400", "border-gray-200", "cursor-not-allowed", "opacity-50");
           } else {
             btn.classList.add("bg-primary", "text-white", "hover:bg-accent");
             btn.classList.remove("bg-gray-100", "text-gray-400", "border-gray-200", "cursor-not-allowed", "opacity-50");
           }
           
           btn.style.pointerEvents = isDisabled ? "none" : "auto";
        });
    }
  }

  bindReceiptClose() {
    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-tp-receipt-close]");
      if (closeBtn) {
        this.items = [];
        this.render();
      }
    });
  }

  addItem(product) {
    const existing = this.items.find(item => item.barcode === product.barcode);
    const stockProduct = GLOBAL_PRODUCTS.find(p => p.barcode === product.barcode);
    const max = stockProduct ? stockProduct.quantity : 0;

    if (existing) {
      if (existing.quantity + product.quantity > max) {
         showErrorToast(`Cannot add more. Limit is ${max}`);
         return false;
      }
      existing.quantity += product.quantity;
    } else {
      if (product.quantity > max) {
         showErrorToast(`Cannot add. Limit is ${max}`);
         return false;
      }
      this.items.push({...product});
    }
    this.render();
    return true;
  }

  removeItem(barcode) {
    this.items = this.items.filter(item => item.barcode !== barcode);
    this.render();
  }

  updateQuantity(barcode, delta) {
    const item = this.items.find(i => i.barcode === barcode);
    const stockProduct = GLOBAL_PRODUCTS.find(p => p.barcode === barcode);
    const max = stockProduct ? stockProduct.quantity : 0;

    if (item) {
      const nextQty = item.quantity + delta;
      if (nextQty > max) {
         showErrorToast(`Limit is ${max}`);
         return;
      }
      if (nextQty > 0) {
        item.quantity = nextQty;
      } else {
        this.removeItem(barcode);
      }
    }
    this.render();
  }

  render() {
    const container = document.getElementById("tp-receipt-items-container");
    const mobileContainer = document.getElementById("tp-receipt-items-container-mobile");
    if (!container && !mobileContainer) return;

    const html = this.items.map(item => `
      <div class="flex items-center justify-between py-3 border-b border-text/5 last:border-0">
        <div class="flex-1 min-w-0 pr-4">
          <p class="text-sm font-bold text-text truncate">${item.name}</p>
          <p class="text-xs text-text/60">${formatPeso(item.price)}</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center bg-background/50 rounded-lg p-1">
            <button class="h-6 w-6 flex items-center justify-center text-text/60 hover:text-primary transition" onclick="productCartManager.updateQuantity('${item.barcode}', -1)">−</button>
            <span class="w-8 text-center text-sm font-bold">${item.quantity}</span>
            <button class="h-6 w-6 flex items-center justify-center text-text/60 hover:text-primary transition" onclick="productCartManager.updateQuantity('${item.barcode}', 1)">+</button>
          </div>
          <p class="text-sm font-black text-text w-20 text-right">${formatPeso(item.price * item.quantity)}</p>
        </div>
      </div>
    `).join("");

    if (container) container.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;

    const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.12; 
    const total = subtotal + tax;

    document.querySelectorAll("[data-receipt-subtotal]").forEach(el => el.textContent = formatPeso(subtotal));
    document.querySelectorAll("[data-receipt-tax]").forEach(el => el.textContent = formatPeso(tax));
    document.querySelectorAll("[data-receipt-total]").forEach(el => el.textContent = formatPeso(total));

    const totalBadge = document.getElementById("tp-cart-total-badge");
    if (totalBadge) {
       const count = this.items.reduce((sum, i) => sum + i.quantity, 0);
       totalBadge.textContent = count;
       totalBadge.classList.toggle("hidden", count === 0);
    }
  }
}

export const productCartManager = new CartManager();
