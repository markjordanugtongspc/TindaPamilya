import { formatPeso, SAMPLE_PRODUCTS, initProductGrid } from "./products.js";
import { showSuccessToast, showErrorToast } from "./modals.js";

class CartManager {
  constructor() {
    this.items = [];
    this.init();
  }

  init() {
    console.log("CartManager: Initialized");
    this.bindAddToCart();
    this.bindCartInteractions();
    this.bindReceiptControls();
    this.initScannerListener();
  }

  initScannerListener() {
    window.addEventListener("tp-barcode-scanned", (e) => {
      const barcode = e.detail?.code;
      if (!barcode) return;

      const product = SAMPLE_PRODUCTS.find(p => p.barcode === barcode);
      
      if (product) {
        showSuccessToast("PRODUCT FOUND: " + product.name);
        this.addItem({
          barcode: product.barcode,
          name: product.name,
          price: product.salePrice,
          quantity: 1
        });
      } else {
        showErrorToast("PRODUCT NOT FOUND: " + barcode);
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
      const name = drawer.querySelector("[data-pi-name]")?.textContent || "Product";
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
        // Reset ALL qty inputs in drawer 
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

    // Handle manual input field changes
    document.addEventListener("input", (e) => {
       const triggeredInput = e.target.closest("[data-pi-qty-val]");
       if (triggeredInput) {
          const container = triggeredInput.closest("[data-tp-product-info-mount]");
          const barcode = (container.querySelector("[data-pi-barcode]")?.textContent || "").trim();
          const stockProduct = SAMPLE_PRODUCTS.find(p => p.barcode === barcode);
          
          let val = parseInt(triggeredInput.value, 10);
          if (isNaN(val)) val = 0;
          
          const max = stockProduct ? stockProduct.quantity : 0;
          if (val > max) {
             val = max;
             showErrorToast(`Limit reached: Only ${max} in stock`);
          } else if (val < 0) {
             val = 0;
          }
          
          // SYNC ALL INPUTS in the container
          const allInputs = container.querySelectorAll("[data-pi-qty-val]");
          allInputs.forEach(input => {
             input.value = val;
          });
          
          if (container) this.syncDrawerPlusState(container);
       }
    });

    // Handle drawer quantity increment/decrement buttons
    document.addEventListener("click", (e) => {
       const plus = e.target.closest("[data-pi-qty-plus]");
       const minus = e.target.closest("[data-pi-qty-minus]");
       if (plus || minus) {
          const container = (plus || minus).closest("[data-tp-product-info-mount]");
          if (container) {
             const qtyInputs = container.querySelectorAll("[data-pi-qty-val]");
             const barcode = (container.querySelector("[data-pi-barcode]")?.textContent || "").trim();
             const stockProduct = SAMPLE_PRODUCTS.find(p => p.barcode === barcode);

             if (qtyInputs.length > 0) {
                let v = parseInt(qtyInputs[0].value, 10) || 0;
                
                if (plus) {
                   if (stockProduct && v >= stockProduct.quantity) {
                      showErrorToast("Limit reached: Only " + stockProduct.quantity + " in stock");
                      return;
                   }
                   v++;
                } else if (minus && v > 0) {
                   // Allow decreasing to 0 if they want, but addItem will check for >0
                   v--;
                }
                
                qtyInputs.forEach(input => input.value = v);
                this.syncDrawerPlusState(container);
             }
          }
       }
    });

    // Professional initialization when drawer opens
    window.addEventListener("tp:drawer-opened", (e) => {
       const drawer = document.querySelector("[data-tp-product-info-mount]");
       if (drawer) {
          const barcode = (drawer.querySelector("[data-pi-barcode]")?.textContent || "").trim();
          const stockProduct = SAMPLE_PRODUCTS.find(p => p.barcode === barcode);
          const qtyInputs = drawer.querySelectorAll("[data-pi-qty-val]");
          
          if (stockProduct && qtyInputs.length > 0) {
             // AUTO-SYNC: set value to current max stocks OR 1 (if available)
             // Let's stick with user's requested "max out" logic but handle 0
             qtyInputs.forEach(input => {
                input.value = stockProduct.quantity;
             });
             this.syncDrawerPlusState(drawer);
          }
       }
    });
  }

  syncDrawerPlusState(container) {
     const qtyInputs = container.querySelectorAll("[data-pi-qty-val]");
     const barcode = (container.querySelector("[data-pi-barcode]")?.textContent || "").trim();
     const stockProduct = SAMPLE_PRODUCTS.find(p => p.barcode === barcode);
     const plusBtns = container.querySelectorAll("[data-pi-qty-plus]");
     const minusBtns = container.querySelectorAll("[data-pi-qty-minus]");
     const addBtns = container.querySelectorAll("[data-tp-add-to-cart]");
     
     if (qtyInputs.length > 0 && stockProduct) {
        const v = parseInt(qtyInputs[0].value, 10) || 0;
        const max = stockProduct.quantity;

        plusBtns.forEach(btn => {
           const isDisabled = v >= max || max <= 0;
           btn.classList.toggle("opacity-30", isDisabled);
           btn.classList.toggle("cursor-not-allowed", isDisabled);
           btn.classList.toggle("pointer-events-none", isDisabled);
        });

        minusBtns.forEach(btn => {
           const isDisabled = v <= 0;
           btn.classList.toggle("opacity-30", isDisabled);
           btn.classList.toggle("cursor-not-allowed", isDisabled);
           btn.classList.toggle("pointer-events-none", isDisabled);
        });

        addBtns.forEach(btn => {
           const isDisabled = v <= 0 || max <= 0;
           btn.disabled = isDisabled;
           btn.classList.toggle("opacity-50", isDisabled);
           btn.classList.toggle("cursor-not-allowed", isDisabled);
           
           if (max <= 0) {
              btn.innerHTML = `<span class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> OUT OF STOCK</span>`;
           } else {
              btn.textContent = "ADD TO CART";
           }
        });
     }
  }

  bindCartInteractions() {
     document.addEventListener("click", (e) => {
        const placeOrder = e.target.closest("[data-tp-place-order]");
        if (placeOrder) {
           if (this.items.length > 0) this.checkout();
        }

        const plus = e.target.closest("[data-cart-qty-inc]");
        if (plus) {
           this.updateQuantity(parseInt(plus.dataset.index), 1);
        }
        const minus = e.target.closest("[data-cart-qty-dec]");
        if (minus) {
           this.updateQuantity(parseInt(minus.dataset.index), -1);
        }
        const remove = e.target.closest("[data-cart-remove]");
        if (remove) {
           this.removeItem(parseInt(remove.dataset.index));
        }
     });
  }

  bindReceiptControls() {
    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-tp-receipt-close]");
      if (closeBtn) {
        this.items = [];
        this.render();
      }
      
      const printBtn = e.target.closest("#tp-receipt-print");
      if (printBtn) {
        const printArea = document.getElementById("tp-receipt-print-area");
        if (printArea) {
           const printContent = printArea.innerHTML;
           const printWindow = window.open('', '', 'height=600,width=800');
           printWindow.document.write(`<html><head><title>Receipt</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-8 max-w-xs mx-auto font-mono text-gray-900">${printContent}</body></html>`);
           printWindow.document.close();
           setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
        }
      }
    });
  }

  addItem(product) {
    const stockProduct = SAMPLE_PRODUCTS.find(p => p.barcode === product.barcode.trim());
    
    // Strict Case: Out of stock completely
    if (stockProduct && stockProduct.quantity <= 0) {
       showErrorToast(`OUT OF STOCK: ${product.name}`);
       return false;
    }

    const existing = this.items.find(i => i.barcode === product.barcode && i.barcode !== "—");
    
    // Check if adding more exceeds stock
    if (stockProduct) {
       const currentQty = existing ? existing.quantity : 0;
       if (currentQty + product.quantity > stockProduct.quantity) {
          showErrorToast(`Cannot add more: Only ${stockProduct.quantity} available.`);
          return false;
       }
    }

    if (existing) {
      existing.quantity += product.quantity;
    } else {
      this.items.push({...product});
    }
    this.render();
    return true;
  }

  updateQuantity(index, delta) {
    const item = this.items[index];
    if (item) {
      if (delta > 0) {
         const stockProduct = SAMPLE_PRODUCTS.find(p => p.barcode === item.barcode);
         if (stockProduct && item.quantity >= stockProduct.quantity) {
            showErrorToast("Limit reached: Max stock available.");
            return;
         }
      }
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeItem(index);
      } else {
        this.render();
      }
    }
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.render();
  }

  render() {
    const listMounts = document.querySelectorAll("[data-cart-items-list]");
    let subtotal = 0;
    let totalItems = 0;

    const htmls = this.items.map((item, idx) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;

      const stockProduct = SAMPLE_PRODUCTS.find(p => p.barcode === item.barcode);
      const isMax = stockProduct ? item.quantity >= stockProduct.quantity : false;
      const plusDisabledAttr = isMax ? 'disabled' : '';
      const plusClass = isMax ? 'opacity-30 cursor-not-allowed pointer-events-none' : '';

      return `
      <li class="border-b border-text/10 pb-4 last:border-0 dark:border-white/10">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-text">${item.name}</p>
            <p class="text-xs text-text/55">Amount ${formatPeso(item.price)}</p>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <div class="inline-flex items-center gap-1.5 rounded-full bg-neutral-quaternary/90 px-1 py-0.5 dark:bg-white/10">
              <button type="button" data-cart-qty-dec data-index="${idx}"
                class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-emerald-400 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><span class="text-lg leading-none">−</span></button>
              <span class="min-w-8 text-center text-sm font-semibold tabular-nums text-text">${item.quantity}</span>
              <button type="button" data-cart-qty-inc data-index="${idx}" ${plusDisabledAttr}
                class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-emerald-400 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${plusClass}"><span class="text-lg leading-none">+</span></button>
            </div>
            <p class="text-sm font-semibold tabular-nums text-text sm:min-w-18 sm:text-end">${formatPeso(itemTotal)}</p>
            
            <button type="button" data-cart-remove data-index="${idx}"
              class="group inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-red-500 transition hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 dark:text-red-400 dark:hover:text-red-500"
              aria-label="Remove line">
              <svg class="hidden h-5 w-5 lg:block group-hover:hidden" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1-1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
              </svg>
              <svg class="h-5 w-5 lg:hidden lg:group-hover:block" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </li>`;
    }).join("");

    listMounts.forEach(m => {
       m.innerHTML = htmls;
       const container = m.parentElement;
       const emptyState = container.querySelector("[data-cart-empty]");
       if (emptyState) emptyState.classList.toggle("hidden", this.items.length > 0);
    });

    document.querySelectorAll("[data-cart-total-items]").forEach(el => {
      el.textContent = `${totalItems} items`;
    });
    document.querySelectorAll("[data-cart-subtotal]").forEach(el => {
      el.textContent = formatPeso(subtotal);
    });
    document.querySelectorAll("[data-cart-total]").forEach(el => {
      el.textContent = formatPeso(subtotal); 
    });
    document.querySelectorAll("[data-tp-place-order]").forEach(btn => {
      btn.disabled = this.items.length === 0;
    });
  }

  checkout() {
    const listMounts = document.querySelectorAll("[data-tp-receipt-mount]");
    if (listMounts.length === 0) return;

    let subtotal = 0;
    const itemsHtml = this.items.map(item => {
       const itemTotal = item.price * item.quantity;
       subtotal += itemTotal;
       return `<li class="flex justify-between items-start gap-2">
          <div class="flex-1 min-w-0">
             <span class="block truncate">${item.name}</span>
             <span class="text-xs text-gray-500">${item.quantity} x ${formatPeso(item.price)}</span>
          </div>
          <span class="tabular-nums shrink-0">${formatPeso(itemTotal)}</span>
       </li>`;
    }).join("");

    const d = new Date();
    const dateStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    const orderId = `#${Math.floor(Math.random() * 899999 + 100000)}`;

    listMounts.forEach(mount => {
       const ul = mount.querySelector("#tp-receipt-items");
       if (ul) ul.innerHTML = itemsHtml;
       
       const subEl = mount.querySelector("[data-receipt-subtotal]");
       const totEl = mount.querySelector("[data-receipt-total]");
       const dateEl = mount.querySelector("[data-receipt-date]");
       const idEl = mount.querySelector("[data-receipt-id]");

       if (subEl) subEl.textContent = formatPeso(subtotal);
       if (totEl) totEl.textContent = formatPeso(subtotal);
       if (dateEl) dateEl.textContent = `Date: ${dateStr}`;
       if (idEl) idEl.textContent = `Order ID: ${orderId}`;
    });

    // Hide order drawers (Current Sale)
    document.querySelectorAll("[data-tp-drawer-close='right'], [data-tp-drawer-close='bottom']").forEach(btn => {
       if (btn.closest("#tp-orders-drawer-right") || btn.closest("#tp-orders-drawer-bottom")) {
          btn.click();
       }
    });

    // Reduce stocks in SAMPLE_PRODUCTS
    this.items.forEach(cartItem => {
       const product = SAMPLE_PRODUCTS.find(p => p.barcode === cartItem.barcode.trim());
       if (product) {
          product.quantity = Math.max(0, product.quantity - cartItem.quantity);
       }
    });
    // Refresh the UI grid to show new stock levels
    initProductGrid();

    window.dispatchEvent(new CustomEvent("tp:receipt-show"));
  }
}

export const productCartManager = new CartManager();
