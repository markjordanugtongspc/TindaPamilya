import { Drawer, Dropdown } from "flowbite";
import { renderProductCard } from "./products.js";
import { GLOBAL_PRODUCTS } from "./products.js";
import { Datepicker } from "flowbite-datepicker";
import { showSuccessToast } from "./modals.js";
import { updateGlobalDrawerState } from "./drawer.js";

const backdropClasses = "bg-black/45 fixed inset-0 z-[45] backdrop-blur-[1px] dark:bg-black/60";

class ProductManager {
  constructor() {
    this.addBtn = document.getElementById("tp-add-product-btn");
    this.template = document.getElementById("tp-add-product-template");
    this.drawerRight = document.getElementById("tp-add-product-drawer-right");
    this.drawerBottom = document.getElementById("tp-add-product-drawer-bottom");
    
    // Check if on products page
    if (this.addBtn && this.template) {
      this.init();
      this.setupImageUpload();
    }
  }

  init() {
    // Mount template contents to drawers
    document.querySelectorAll("[data-tp-add-product-mount]").forEach((mount) => {
      if (mount.childElementCount > 0) return;
      mount.appendChild(this.template.content.cloneNode(true));
      this.initCategoryOptions(mount);
      this.setupForm(mount);
    });

    const drawerOpts = { 
      backdrop: true, 
      bodyScrolling: false, 
      backdropClasses,
      onShow: () => updateGlobalDrawerState(true),
      onHide: () => updateGlobalDrawerState(false),
    };
    this.rightDrawerInstance = new Drawer(this.drawerRight, { ...drawerOpts, placement: "right" }, { id: "tp-add-product-drawer-right", override: true });
    this.bottomDrawerInstance = new Drawer(this.drawerBottom, { ...drawerOpts, placement: "bottom" }, { id: "tp-add-product-drawer-bottom", override: true });

    this.mq = window.matchMedia("(min-width: 1024px)");
    this.applyRightDrawerLayout();

    this.addBtn.addEventListener("click", () => this.openDrawer());

    document.querySelectorAll("[data-tp-add-product-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const which = btn.getAttribute("data-tp-add-product-close");
        if (which === "right") this.rightDrawerInstance.hide();
        if (which === "bottom") this.bottomDrawerInstance.hide();
      });
    });

    // Handle scanner modal open/close to maintain drawer state
    window.addEventListener("tp:scanner-modal-open", () => {
      if (!this.drawerRight.classList.contains("translate-x-full")) {
        localStorage.setItem("tp_add_product_drawer_restore", "right");
        this.rightDrawerInstance.hide();
      } else if (!this.drawerBottom.classList.contains("translate-y-full")) {
        localStorage.setItem("tp_add_product_drawer_restore", "bottom");
        this.bottomDrawerInstance.hide();
      }
    });

    window.addEventListener("tp:scanner-result", (e) => {
       const barcode = e.detail?.barcode;
       if (barcode) {
          const form = document.getElementById("tp-add-product-form");
          if (form) {
             const input = form.querySelector("#ap-barcode");
             if (input) input.value = barcode;
             const restore = localStorage.getItem("tp_add_product_drawer_restore");
             if (restore === "right") this.rightDrawerInstance.show();
             if (restore === "bottom") this.bottomDrawerInstance.show();
             localStorage.removeItem("tp_add_product_drawer_restore");
          }
       }
    });
    
    window.addEventListener("tp:scanner-modal-close", () => {
      const restore = localStorage.getItem("tp_add_product_drawer_restore");
      localStorage.removeItem("tp_add_product_drawer_restore");
      if (restore === "right" && this.mq.matches) this.rightDrawerInstance.show();
      if (restore === "bottom" && !this.mq.matches) this.bottomDrawerInstance.show();
    });
  }

  setupForm(mount) {
    const form = mount.querySelector("form");
    if (!form) return;

    // Category Buttons
    const catInput = form.querySelector("#ap-category");
    const catClear = form.querySelector("#ap-cat-clear");
    const catAddTrigger = form.querySelector("#ap-cat-add-modal-trigger");

    if (catClear && catInput) {
      catClear.addEventListener("click", () => {
        catInput.value = "";
      });
    }

    // Handle Category Modal and Dropdown
    const categoryModalConfirm = document.getElementById("tp-add-category-confirm");
    const categoryModalInput = document.getElementById("new-category-name");
    const dropdownList = mount.querySelector("#tp-categories-list-ul");
    const dropdownToggle = mount.querySelector("#cat-dropdown-btn");
    const dropdownEl = mount.querySelector("#tp-categories-dropdown");
    
    // Initialize Flowbite Dropdown manually to ensure it works within the drawer
    let catDropdown;
    if (dropdownToggle && dropdownEl) {
       catDropdown = new Dropdown(dropdownEl, dropdownToggle, {
          placement: 'bottom-end',
          offsetSkidding: 0,
          offsetDistance: 10,
       });
    }

    const bindDropdownItems = () => {
       mount.querySelectorAll("[data-cat-value]").forEach(btn => {
          btn.addEventListener("click", () => {
             catInput.value = btn.getAttribute("data-cat-value");
             if (catDropdown) catDropdown.hide();
          });
       });
    };
    bindDropdownItems();
    
    // Prefill modal from input
    if (catAddTrigger) {
       catAddTrigger.addEventListener("click", () => {
          if (catInput && categoryModalInput) {
             categoryModalInput.value = catInput.value;
          }
       });
    }
    
    if (categoryModalConfirm && categoryModalInput && catInput) {
      categoryModalConfirm.addEventListener("click", () => {
        const val = categoryModalInput.value.trim();
        if (val) {
          catInput.value = val;
          // Add to drawer dropdown if not exists
          if (dropdownList) {
            const existing = Array.from(dropdownList.querySelectorAll("button")).map(b => b.getAttribute("data-cat-value").toLowerCase());
            if (!existing.includes(val.toLowerCase())) {
              const li = document.createElement("li");
              li.innerHTML = `<button type="button" class="flex w-full cursor-pointer items-center px-4 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-left font-semibold" data-cat-value="${val}">${val}</button>`;
              dropdownList.appendChild(li);
              bindDropdownItems(); // Re-bind new items
              
              // Sync with Main Filter Dropdown
              const mainFilter = document.getElementById("products-category");
              if (mainFilter) {
                 const opt = document.createElement("option");
                 opt.value = val; 
                 opt.textContent = val;
                 mainFilter.appendChild(opt);
              }
            }
          }
          categoryModalInput.value = "";
          // Close modal using Flowbite data attribute behavior or manually
          const modalHideBtn = document.querySelector('[data-modal-hide="tp-category-modal"]');
          if (modalHideBtn) modalHideBtn.click();
          showSuccessToast(`Category "${val}" added.`);
        }
      });
    }
    
    // Datepicker
    const dateInput = form.querySelector("#ap-expiration");
    if (dateInput) {
      new Datepicker(dateInput, {
         autohide: true,
         format: 'mm-dd-yyyy',
         orientation: 'bottom'
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const barcode = fd.get("barcode");
      const subBtn = form.querySelector('[type="submit"]');
      if (subBtn) subBtn.disabled = true;
      
      const newProduct = {
        barcode: barcode,
        name: fd.get("name"),
        sku: `TP-NEW-${barcode}`,
        category: fd.get("category"),
        expirationDate: fd.get("expiration"),
        salePrice: parseFloat(fd.get("sale")),
        purchasePrice: parseFloat(fd.get("purchase")),
        description: fd.get("desc"),
        quantity: parseInt(fd.get("stocks"), 10),
        image: mount.closest("[id*='drawer']").querySelector("[id*='preview']").src
      };

      try {
        const res = await fetch("/api/sales/product_api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProduct)
        });
        const data = await res.json();
        
        if (data.success) {
          // Update local ID if available
          newProduct.id = data.id;
        } else {
          console.error("API error:", data.error);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (subBtn) subBtn.disabled = false;
      }

      // PERSIST: Add to global array so it becomes scannable
      GLOBAL_PRODUCTS.push(newProduct);

      const card = renderProductCard(newProduct);
      if (card) {
        // Carry over extra data for the Info drawer
        card.dataset.productPurchase = newProduct.purchasePrice;
        card.dataset.productExpiration = newProduct.expirationDate;
        card.dataset.productImage = newProduct.image;
        card.dataset.productDescription = newProduct.description;
        card.dataset.productCategory = newProduct.category;

        const grid = document.getElementById("tp-products-grid");
        if (grid) {
           grid.insertBefore(card, grid.firstChild);
        }
      }
      
      showSuccessToast(`Product "${newProduct.name}" added successfully!`);
      form.reset();
      
      if (this.mq.matches) this.rightDrawerInstance.hide();
      else this.bottomDrawerInstance.hide();
    });
  }

  applyRightDrawerLayout() {
    const apply = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        const nav = document.querySelector("nav.fixed.top-0.z-50");
        const topPx = nav ? Math.round(nav.getBoundingClientRect().height) : 76;
        this.drawerRight.style.top = `${topPx}px`;
        this.drawerRight.style.height = `calc(100vh - ${topPx}px)`;
        this.drawerRight.style.maxHeight = `calc(100vh - ${topPx}px)`;
      } else {
        this.drawerRight.style.removeProperty("top");
        this.drawerRight.style.removeProperty("height");
        this.drawerRight.style.removeProperty("max-height");
      }
    };
    window.addEventListener("resize", apply);
    apply();
    window.requestAnimationFrame(() => apply());
  }

  initCategoryOptions(mount) {
     const mainFilter = document.getElementById("products-category");
     const ul = mount.querySelector("#tp-categories-list-ul");
     if (!mainFilter || !ul) return;

     const options = Array.from(mainFilter.options)
        .filter(opt => opt.value !== "")
        .map(opt => opt.textContent);

     const existing = Array.from(ul.querySelectorAll("button")).map(b => b.getAttribute("data-cat-value")?.toLowerCase());
     
     options.forEach(cat => {
        if (!existing.includes(cat.toLowerCase())) {
           const li = document.createElement("li");
           li.innerHTML = `<button type="button" class="flex w-full cursor-pointer items-center px-4 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-left font-semibold" data-cat-value="${cat}">${cat}</button>`;
           ul.appendChild(li);
        }
     });
  }

  setupImageUpload() {
    const uploadDesktop = document.getElementById("ap-cover-upload-desktop");
    const previewDesktop = document.getElementById("ap-cover-preview-desktop");
    const uploadMobile = document.getElementById("ap-cover-upload-mobile");
    const previewMobile = document.getElementById("ap-cover-preview-mobile");

    const onFileChange = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        [previewDesktop, previewMobile].forEach(img => {
          if (img) {
            img.src = result;
            img.classList.remove("dark:brightness-0", "dark:invert", "brightness-0", "invert", "opacity-90");
            img.classList.add("object-cover");
          }
        });
      };
      reader.readAsDataURL(file);
    };

    [uploadDesktop, uploadMobile].forEach(input => {
      if (input) {
        input.addEventListener("change", (e) => onFileChange(e.target.files[0]));
      }
    });
  }


  openDrawer() {
    if (this.mq.matches) {
      this.bottomDrawerInstance.hide();
      this.rightDrawerInstance.show();
    } else {
      this.rightDrawerInstance.hide();
      this.bottomDrawerInstance.show();
    }
  }
}

// export default required for main.js or other imports
export const productManager = new ProductManager();
