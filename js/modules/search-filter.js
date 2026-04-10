import { GLOBAL_PRODUCTS, initProductGrid } from "./products.js";

export function initSearchAndFilter() {
  const searchInput = document.querySelector('input[name="products-search"]');
  const catSelect = document.getElementById('products-category');
  const catDropdownList = document.getElementById('tp-categories-list-ul');

  const applyFilters = () => {
    const q = searchInput?.value.trim().toLowerCase() || "";
    const cat = catSelect?.value || "";

    const grid = document.getElementById("tp-products-grid");
    if (!grid) return;

    const cards = grid.querySelectorAll("[data-product-card]");
    cards.forEach(card => {
      let isMatch = true;
      const name = card.querySelector("[data-product-name]")?.textContent?.toLowerCase() || "";
      const sku = card.querySelector("[data-product-sku]")?.textContent?.toLowerCase() || "";
      const barcode = card.dataset.productBarcode?.toLowerCase() || "";
      const pCat = card.dataset.productCategory || "";

      if (q && !name.includes(q) && !sku.includes(q) && !barcode.includes(q)) {
        isMatch = false;
      }

      if (cat && pCat !== cat) {
        if (cat === "Other" && pCat) {
          // If category is other, do strict match unless we want to catch unmapped.
          if (["Mga Ingredients", "Inumin", "Chichirya", "Pagkaing de-lata", "Miscellaneous", "Personal care"].includes(pCat)) {
             isMatch = false;
          }
        } else {
          isMatch = false;
        }
      }

      if (isMatch) {
         card.classList.remove('hidden');
         card.style.display = '';
      } else {
         card.classList.add('hidden');
         card.style.display = 'none';
      }
    });
  };

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (catSelect) catSelect.addEventListener("change", applyFilters);
}
