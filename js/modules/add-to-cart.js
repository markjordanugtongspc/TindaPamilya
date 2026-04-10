import { formatPeso } from "./products.js";

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
  }

  bindAddToCart() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tp-add-to-cart]");
      if (!btn) return;
      
      const drawer = btn.closest("[data-tp-product-info-mount]");
      if (!drawer) return;

      const barcode = drawer.querySelector("[data-pi-barcode]")?.textContent || "—";
      const name = drawer.querySelector("[data-pi-name]")?.textContent || "Product";
      const priceStr = drawer.querySelector("[data-pi-sale]")?.textContent || "0";
      const price = parseFloat(priceStr.replace(/[^0-9.-]+/g,"")) || 0;
      const qtyStr = drawer.querySelector("[data-pi-qty-val]")?.textContent || "1";
      const qty = parseInt(qtyStr, 10) || 1;

      this.addItem({ barcode, name, price, quantity: qty });
      
      // Reset qty in drawer
      const qtySpans = drawer.querySelectorAll("[data-pi-qty-val]");
      qtySpans.forEach(span => span.textContent = "1");
      
      // Optionally show toast
      import("./products.js").then((m) => {
         m.showSuccessToast(`${qty} ${name} added to cart.`);
      });
      
      // Close the product info drawer
      document.querySelectorAll("[data-tp-product-info-close]").forEach((btn) => {
         btn.click();
      });
    });

    // Handle drawer quantity increment/decrement
    document.addEventListener("click", (e) => {
       const plus = e.target.closest("[data-pi-qty-plus]");
       const minus = e.target.closest("[data-pi-qty-minus]");
       if (plus || minus) {
          const container = (plus || minus).closest("[data-tp-product-info-mount]");
          if (container) {
             const qtySpans = container.querySelectorAll("[data-pi-qty-val]");
             if (qtySpans.length > 0) {
                let v = parseInt(qtySpans[0].textContent, 10) || 1;
                if (plus) v++;
                else if (minus && v > 1) v--;
                qtySpans.forEach(span => span.textContent = v);
             }
          }
       }
    });
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
    const existing = this.items.find(i => i.barcode === product.barcode && i.barcode !== "—");
    if (existing) {
      existing.quantity += product.quantity;
    } else {
      this.items.push({...product});
    }
    this.render();
  }

  updateQuantity(index, delta) {
    if (this.items[index]) {
      this.items[index].quantity += delta;
      if (this.items[index].quantity <= 0) {
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
              <button type="button" data-cart-qty-inc data-index="${idx}"
                class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-emerald-400 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><span class="text-lg leading-none">+</span></button>
            </div>
            <p class="text-sm font-semibold tabular-nums text-text sm:min-w-18 sm:text-end">${formatPeso(itemTotal)}</p>
            <button type="button" data-cart-remove data-index="${idx}"
              class="inline-flex cursor-pointer items-center rounded-lg p-1.5 text-red-500 ring-1 ring-red-400/40 transition hover:bg-red-50 dark:hover:bg-red-950/40"
              aria-label="Remove line">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1-3h10l1 3M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
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

    window.dispatchEvent(new CustomEvent("tp:receipt-show"));
  }
}

export const productCartManager = new CartManager();
