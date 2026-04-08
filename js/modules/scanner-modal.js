export function initScannerModal() {
  const SCANNER_MODAL_ID = "tp-add-product-modal";
  const modal = document.getElementById(SCANNER_MODAL_ID);
  if (!(modal instanceof HTMLElement)) return;

  const status = modal.querySelector("[data-scanner-status]");
  if (!(status instanceof HTMLElement)) return;

  let scannerApi = null;
  let busy = false;
  let modalInstance = null;

  const dispatch = (name) => {
    window.dispatchEvent(new CustomEvent(name));
  };

  const ensureScanner = async () => {
    if (scannerApi) return scannerApi;
    const mod = await import("./html5-qrcode.js");
    scannerApi = mod.createBarcodeScanner("reader", (text) => {
      status.textContent = text;
    });
    return scannerApi;
  };

  const showModal = async () => {
    if (busy) return;
    busy = true;
    try {
      if (!modalInstance) {
        const flowbite = await import("flowbite");
        modalInstance = new flowbite.Modal(
          modal,
          {
            placement: "center",
            backdrop: "dynamic",
            backdropClasses:
              "bg-black/45 fixed inset-0 z-[45] backdrop-blur-[1px] dark:bg-black/60",
            closable: true,
          },
          { id: SCANNER_MODAL_ID, override: true },
        );
      }

      modalInstance.show();
      dispatch("tp:scanner-modal-open");
      const scanner = await ensureScanner();
      await scanner.start();
    } finally {
      busy = false;
    }
  };

  const hideModal = async () => {
    const scanner = await ensureScanner();
    await scanner.stop();
    modalInstance?.hide();
    dispatch("tp:scanner-modal-close");
  };

  document.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "tp-scanner-file-input") {
      const file = target.files?.[0];
      if (!file) return;
      
      const scanner = await ensureScanner();
      try {
        await scanner.scanFile(file);
      } catch (err) {
        console.warn("[File Scan Warning]", err);
      }
      target.value = ""; // Clear input for next use
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-scanner-open]")) {
      event.preventDefault();
      void showModal();
      return;
    }
    if (target.closest("[data-scanner-close]")) {
      event.preventDefault();
      void hideModal();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (!scannerApi) return;
    void scannerApi.stop();
  });
}
