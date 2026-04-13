import { Drawer, Dropdown } from "flowbite";
import { renderProductCard } from "./products.js";
import { GLOBAL_PRODUCTS } from "./products.js";
import { Datepicker } from "flowbite-datepicker";
import { showSuccessToast } from "./modals.js";
import { updateGlobalDrawerState, applyRightDrawerDesktopLayout } from "./drawer.js";

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
    applyRightDrawerDesktopLayout(this.drawerRight);

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

    window.addEventListener("tp:barcode-scanned", (e) => {
       const barcode = (e.detail?.barcode || "").trim();
       if (barcode) {
          const restore = localStorage.getItem("tp_add_product_drawer_restore");
          if (!restore) return; // Only process if the scanner was opened from the 'Add Product' context

          // 1. Anti-Duplicate Validation: Check if product already exists
          const existingProduct = GLOBAL_PRODUCTS.find(p => p.barcode === barcode);
          
          if (existingProduct) {
             // If found, show error toast and KEEP THE DRAWER HIDDEN (Clean up restore state)
             showErrorToast(`There is already an existing product: "${existingProduct.name}"`);
             localStorage.removeItem("tp_add_product_drawer_restore");
             return; 
          }

          // 2. Success Path: Product is new, automatically insert barcode
          // We query all instances because the form is cloned into mobile (bottom) and desktop (right) drawers
          const forms = document.querySelectorAll("#tp-add-product-form");
          forms.forEach(form => {
             const input = form.querySelector("#ap-barcode");
             if (input) {
                input.value = barcode;
                // Trigger input event to ensure any dynamic UI updates occur
                input.dispatchEvent(new Event("input", { bubbles: true }));
             }
          });

          // 3. Restore the correct drawer view (Desktop/Right or Mobile/Bottom)
          if (restore === "right") this.rightDrawerInstance.show();
          if (restore === "bottom") this.bottomDrawerInstance.show();
          
          // Cleanup restore flag after successful navigation back to the drawer
          localStorage.removeItem("tp_add_product_drawer_restore");
          
          showSuccessToast(`Barcode ${barcode} inserted.`);
       }
    });
    
    window.addEventListener("tp:scanner-modal-close", () => {
      const restore = localStorage.getItem("tp_add_product_drawer_restore");
      localStorage.removeItem("tp_add_product_drawer_restore");
      if (restore === "right" && this.mq.matches) this.rightDrawerInstance.show();
      if (restore === "bottom" && !this.mq.matches) this.bottomDrawerInstance.show();
    });

    // Listen for Edit requests from Product Info Drawers
    window.addEventListener("tp:edit-product-open", (e) => {
      const { data } = e.detail;
      if (data) {
        this.openDrawer();
        this.prefillForm(data);
      }
    });
  }

  prefillForm(data) {
    const root = this.mq.matches ? this.drawerRight : this.drawerBottom;
    const form = root.querySelector("form");
    if (!form) return;

    form.querySelector('[name="barcode"]').value = data.barcode || "";
    form.querySelector('[name="name"]').value = data.name || "";
    form.querySelector('[name="category"]').value = (data.category && data.category !== "—" && data.category !== "N/A") ? data.category : "";
    form.querySelector('[name="sale"]').value = data.salePrice || "";
    form.querySelector('[name="purchase"]').value = data.purchasePrice || "";
    form.querySelector('[name="stocks"]').value = data.quantity || "0";
    form.querySelector('[name="desc"]').value = (data.description && data.description !== "—" && data.description !== "N/A") ? data.description : "";
    
    const exp = form.querySelector('[name="expiration"]');
    if (exp) {
       exp.value = (data.expirationDate && data.expirationDate !== "—" && data.expirationDate !== "N/A") ? data.expirationDate : "";
    }
    
    // Set preview image if it exists
    if (data.image) {
      const previewDesktop = document.getElementById("ap-cover-preview-desktop");
      const previewMobile = document.getElementById("ap-cover-preview-mobile");
      if (previewDesktop) previewDesktop.src = data.image;
      if (previewMobile) previewMobile.src = data.image;
    }
  }

  openDrawer() {
    if (this.mq.matches) this.rightDrawerInstance.show();
    else this.bottomDrawerInstance.show();
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
    window.addEventListener("tp:rebind-categories", bindDropdownItems);
    
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
