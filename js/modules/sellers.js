import { initMenuNavigations } from "./navigations.js";
import * as auth from "./auth.js";
import { showSuccessToast, showErrorToast, getSwalTheme } from "./modals.js";
import Swal from "sweetalert2";

let SELLERS_CACHE = [];
let CURRENT_PAGE = 1;
let DEFAULT_PASSWORD = "";
const ITEMS_PER_PAGE = 10;

/**
 * Fetch sellers from the database via API
 */
async function fetchSellers() {
  try {
    const res = await fetch("/api/admin/sellers");
    const json = await res.json();
    if (json.success) {
      if (json.config?.defaultPassword) {
        DEFAULT_PASSWORD = json.config.defaultPassword;
      }
      return json.data || [];
    }
    throw new Error(json.error || "Failed to fetch sellers");
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return [];
  }
}

/**
 * Render the sellers table
 */
function renderSellersTable(sellers = SELLERS_CACHE) {
  const tbody = document.getElementById("sellers-table-body");
  const template = document.getElementById("tp-seller-row-template");
  if (!tbody || !template) return;

  tbody.innerHTML = "";

  const start = (CURRENT_PAGE - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paginated = sellers.slice(start, end);

  if (paginated.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center text-text/50 font-medium">
          No sellers found Matching your search.
        </td>
      </tr>
    `;
    updatePaginationControls(sellers.length);
    return;
  }

  paginated.forEach((seller) => {
    const clone = template.content.cloneNode(true);
    const row = clone.querySelector("tr");

    const avatar = clone.querySelector("[data-seller-avatar]");
    const name = clone.querySelector("[data-seller-name]");
    const email = clone.querySelector("[data-seller-email]");
    const role = clone.querySelector("[data-seller-role]");
    const status = clone.querySelector("[data-seller-status]");
    const dot = clone.querySelector("[data-status-dot]");
    const checkbox = clone.querySelector("[data-seller-checkbox]");
    const editBtn = clone.querySelector("[data-seller-edit]");

    if (avatar) avatar.src = seller.profile_image || "/assets/img/pos-logo.png";
    if (name) name.textContent = seller.full_name || "Unknown";
    
    // Show username next to email or as handle
    if (email) {
      const unameDisplay = seller.username ? `@${seller.username}` : "";
      email.textContent = `${unameDisplay} ${seller.email ? "• " + seller.email : ""}`;
    }
    
    if (role) role.textContent = seller.role || "Seller";
    if (status) status.textContent = seller.status || "Offline";
    if (checkbox) checkbox.value = seller.id;

    // Status dot color
    if (dot) {
      const s = (seller.status || "Offline").toLowerCase();
      if (s === "online") {
        dot.className = "h-2.5 w-2.5 rounded-full bg-emerald-500 me-2.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
      } else if (s === "offline") {
        dot.className = "h-2.5 w-2.5 rounded-full bg-gray-400 me-2.5";
      } else {
        dot.className = "h-2.5 w-2.5 rounded-full bg-amber-500 me-2.5 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
      }
    }

    if (editBtn) {
      editBtn.addEventListener("click", () => openEditSellerModal(seller));
    }

    tbody.appendChild(clone);
  });

  updatePaginationControls(sellers.length);
}

/**
 * Handle pagination numbers and status
 */
function updatePaginationControls(total) {
  const range = document.getElementById("pagination-range");
  const totalEl = document.getElementById("pagination-total");
  const numbers = document.getElementById("pagination-numbers");
  if (!range || !totalEl || !numbers) return;

  const start = (CURRENT_PAGE - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(CURRENT_PAGE * ITEMS_PER_PAGE, total);

  range.textContent = total > 0 ? `${start}-${end}` : "0-0";
  totalEl.textContent = String(total);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  numbers.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `flex items-center justify-center px-4 h-10 leading-tight border border-text/10 transition cursor-pointer ${
      i === CURRENT_PAGE
        ? "bg-primary text-white font-bold border-primary"
        : "bg-background text-text hover:bg-black/5 dark:hover:bg-white/5"
    }`;
    btn.textContent = String(i);
    btn.addEventListener("click", () => {
      CURRENT_PAGE = i;
      renderSellersTable();
    });
    numbers.appendChild(btn);
  }

  const prev = document.getElementById("prev-page");
  const next = document.getElementById("next-page");
  if (prev) prev.disabled = CURRENT_PAGE <= 1;
  if (next) next.disabled = CURRENT_PAGE >= totalPages;
}

/**
 * Open Modal to Add/Edit Seller using SweetAlert2 (Rule 4)
 */
async function openEditSellerModal(seller = null) {
  const isEdit = !!seller;
  const title = isEdit ? "Update Seller Details" : "Register New Seller";
  const { background, color } = getSwalTheme();
  
  const { value: formValues } = await Swal.fire({
    title: title,
    background,
    color,
    html: `
      <div class="p-1 space-y-4 text-left">
        <div class="col-span-2">
            <label for="swal-full-name" class="block mb-2.5 text-sm font-bold text-text uppercase tracking-wider">Full Name</label>
            <input type="text" id="swal-full-name" class="bg-black/5 border border-text/10 text-text text-sm rounded-2xl focus:ring-primary focus:border-primary block w-full px-4 py-3 shadow-sm transition placeholder:text-text/40 dark:bg-white/5 dark:border-white/10" value="${seller?.full_name || ""}" placeholder="e.g. Mark Jordan Ugtong">
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label for="swal-role" class="block mb-2.5 text-sm font-bold text-text uppercase tracking-wider">Position</label>
                <select id="swal-role" class="block w-full px-4 py-3 bg-black/5 border border-text/10 text-text text-sm rounded-2xl focus:ring-primary focus:border-primary shadow-sm transition dark:bg-white/5 dark:border-white/10">
                    <option value="seller" ${seller?.role === "seller" ? "selected" : ""}>Seller</option>
                    <option value="admin" ${seller?.role === "admin" ? "selected" : ""}>Admin</option>
                </select>
            </div>
            <div>
                <label for="swal-status" class="block mb-2.5 text-sm font-bold text-text uppercase tracking-wider">Status</label>
                <select id="swal-status" class="block w-full px-4 py-3 bg-black/5 border border-text/10 text-text text-sm rounded-2xl focus:ring-primary focus:border-primary shadow-sm transition dark:bg-white/5 dark:border-white/10">
                    <option value="Online" ${seller?.status === "Online" ? "selected" : ""}>Online</option>
                    <option value="Offline" ${!seller || seller?.status === "Offline" ? "selected" : ""}>Offline</option>
                    <option value="Archived" ${seller?.status === "Archived" ? "selected" : ""}>Archived</option>
                </select>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label for="swal-username" class="block mb-2.5 text-sm font-bold text-text uppercase tracking-wider">Username</label>
                <input type="text" id="swal-username" class="bg-black/5 border border-text/10 text-text text-sm rounded-2xl focus:ring-primary focus:border-primary block w-full px-4 py-3 shadow-sm transition placeholder:text-text/40 dark:bg-white/5 dark:border-white/10" value="${seller?.username || ""}" placeholder="user123">
            </div>
            <div>
                <label for="swal-email" class="block mb-2.5 text-sm font-bold text-text uppercase tracking-wider">Email Address</label>
                <input type="email" id="swal-email" class="bg-black/5 border border-text/10 text-text text-sm rounded-2xl focus:ring-primary focus:border-primary block w-full px-4 py-3 shadow-sm transition placeholder:text-text/40 dark:bg-white/5 dark:border-white/10" value="${seller?.email || ""}" placeholder="email@store.com">
            </div>
        </div>
        <div class="mt-2 rounded-xl bg-primary/5 p-4 border border-primary/20 dark:bg-primary/10">
            <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                </div>
                <div class="text-xs">
                    <p class="font-bold text-text uppercase tracking-widest opacity-60">Security Reminder</p>
                    <p class="mt-0.5 text-text/80">Default password for new accounts is <code class="font-mono font-bold text-primary select-all px-1 bg-primary/10 rounded">${DEFAULT_PASSWORD}</code></p>
                </div>
            </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: isEdit ? "Update Seller" : "Add Seller",
    confirmButtonColor: "var(--color-primary)",
    cancelButtonColor: "#fecaca", // Light Red
    customClass: {
      popup: "rounded-3xl border border-text/10 bg-secondary ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10",
      title: "text-xl font-bold text-text",
      confirmButton: "cursor-pointer rounded-2xl px-6 py-3 font-bold uppercase tracking-widest text-sm",
      cancelButton: "cursor-pointer rounded-2xl px-6 py-3 font-bold uppercase tracking-widest text-sm !bg-red-100 !text-red-700 hover:!bg-red-200 border border-red-200"
    },
    preConfirm: () => {
      const fullName = document.getElementById("swal-full-name").value;
      const role = document.getElementById("swal-role").value;
      const status = document.getElementById("swal-status").value;
      const email = document.getElementById("swal-email").value;
      const username = document.getElementById("swal-username").value;

      if (!fullName) {
        Swal.showValidationMessage("Please enter a full name");
        return false;
      }
      return { fullName, role, status, email, username };
    }
  });

  if (formValues) {
    try {
      Swal.fire({
        title: "Updating Database...",
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
      });

      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           id: seller?.id,
           fullName: formValues.fullName,
           role: formValues.role,
           status: formValues.status,
           email: formValues.email,
           username: formValues.username
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");

      showSuccessToast(isEdit ? "Seller updated successfully" : "New seller registered");
      refreshSellers();
    } catch (err) {
      console.error("Database operation failed:", err);
      showErrorToast("Failed to save seller data");
    }
  }
}

/**
 * Handle Search logic
 */
function initSearch() {
  const searchInput = document.getElementById("seller-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = SELLERS_CACHE.filter((s) => {
      const name = (s.full_name || "").toLowerCase();
      const email = (s.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
    CURRENT_PAGE = 1;
    renderSellersTable(filtered);
  });
}

/**
 * Handle Select All logic
 */
function initSelectionLogic() {
  const selectAll = document.getElementById("select-all-sellers");
  if (!selectAll) return;

  selectAll.addEventListener("change", (e) => {
    const checked = e.target.checked;
    document.querySelectorAll("[data-seller-checkbox]").forEach((cb) => {
      cb.checked = checked;
    });
  });
}

/**
 * Refresh the sellers list
 */
async function refreshSellers() {
  SELLERS_CACHE = await fetchSellers();
  renderSellersTable();
}

/**
 * Main Initialization
 */
export async function initSellersPage() {
  const status = await auth.isAuthenticated();
  if (!status.authenticated) {
    sessionStorage.setItem("tp_auth_notice", "Restricted access. Please log in.");
    window.location.replace("/index.html");
    return;
  }

  // Ensure sidebar/nav are present
  await initMenuNavigations();

  // Load profile data into UI if required
  const refreshed = await auth.fetchUserProfile(status.user || {});
  const user = refreshed.success ? refreshed.user || {} : status.user || {};
  
  // Update nav labels
  const fullName = user.full_name || "TindaPamilya User";
  const email = user.email || "user@email.com";
  const username = user.username || "user";

  document.querySelectorAll("[data-user-full-name]").forEach(el => el.textContent = fullName);
  document.querySelectorAll("[data-user-username]").forEach(el => el.textContent = username);
  document.querySelectorAll("[data-user-email]").forEach(el => el.textContent = email);
  if (user.profile_image) {
    document.querySelectorAll("[data-user-avatar]").forEach(el => {
      if (el instanceof HTMLImageElement) el.src = user.profile_image;
    });
  }

  // Bind "Add Seller" button
  const addBtn = document.getElementById("tp-add-seller-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => openEditSellerModal());
  }

  initSearch();
  initSelectionLogic();
  await refreshSellers();
}
