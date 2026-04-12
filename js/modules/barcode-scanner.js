import Quagga from '@ericblade/quagga2';
import { Modal } from 'flowbite';

export function initBarcodeScanner() {
  const modal = document.getElementById("tp-barcode-scanner-modal");
  const resultDisplay = document.querySelector('[data-scanner-result]');
  const statusDisplay = document.querySelector('[data-scanner-status]');
  const viewport = document.getElementById("tp-scanner-viewport");

  if (!modal || !viewport) return;

  // Initialize Flowbite Modal for professional, accessible overlay behavior
  // Note: We use the manual instance to handle onShow/onHide camera lifecycle
  const scannerModal = new Modal(modal, {
    placement: 'center',
    backdrop: 'dynamic',
    backdropClasses: 'bg-gray-900/90 fixed inset-0 z-40 backdrop-blur-sm',
    closable: true,
    onHide: () => {
      stopScanner();
      if (resultDisplay) resultDisplay.textContent = "";
      setStatus("Initializing...");
      window.dispatchEvent(new Event("tp:scanner-modal-close"));
    },
    onShow: () => {
      window.dispatchEvent(new Event("tp:scanner-modal-open"));
      startScanner();
    }
  });

  function setStatus(text, error = false) {
    if (!statusDisplay) return;
    statusDisplay.textContent = text;
    if (error) {
      statusDisplay.classList.add('text-red-400');
      statusDisplay.classList.remove('text-emerald-400', 'text-white/80');
    } else {
      statusDisplay.classList.remove('text-red-400', 'text-emerald-400');
      statusDisplay.classList.add('text-white/80');
    }
  }

  function setSuccess(text) {
    if (!statusDisplay) return;
    statusDisplay.textContent = text;
    statusDisplay.classList.remove('text-red-400', 'text-white/80');
    statusDisplay.classList.add('text-emerald-400');
  }

  function startScanner() {
    setStatus("Requesting camera...");
    
    // Intercept Quagga's un-suppressable debug logs silently
    const originalLog = console.log;
    console.log = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('InputStreamBrowser')) return;
      originalLog.apply(console, args);
    };

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: viewport,
        constraints: {
          width: { min: 640 },
          height: { min: 480 },
          facingMode: "environment",
          aspectRatio: { min: 1, max: 2 }
        }
      },
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "code_128_reader",
          "code_39_reader",
          "upc_reader",
          "upc_e_reader"
        ],
        multiple: false
      },
      locate: true,
      locator: {
        halfSample: true,
        patchSize: "medium"
      },
      debug: false
    }, function(err) {
      console.log = originalLog; // Restore console immediately after init

      if (err) {
        console.error(err);
        if (err.name === 'NotAllowedError') {
          setStatus("Camera permission denied", true);
        } else {
          setStatus("Camera error: " + err.message, true);
        }
        return;
      }
      
      setStatus("Scanning for barcodes...");
      Quagga.start();
    });

    let scanCounts = {};
    let isVerifying = false;

    Quagga.onDetected(function(result) {
      if (result && result.codeResult && !isVerifying) {
        const code = result.codeResult.code;
        
        // Update the bottom UI instantly with what it thinks it sees without interrupting top scanning status
        if (resultDisplay) resultDisplay.textContent = code;
        
        // Fast Debounce: 3 consecutive matches to guarantee accuracy
        scanCounts[code] = (scanCounts[code] || 0) + 1;
        
        if (scanCounts[code] >= 3) {
          isVerifying = true;
          setStatus("Verifying code " + code + "...");
          
          // Execute quick lockdown
          setTimeout(() => {
            console.log("Scanned Barcode:", code);
            setSuccess("Confirmed: " + code);
            stopScanner();
            scanCounts = {};
            
            setTimeout(() => {
              isVerifying = false;
              closeScanner();
              window.dispatchEvent(new CustomEvent('tp-barcode-scanned', { detail: { code } }));
            }, 600); // reduced close delay
          }, 350); // reduced verify delay
        }
      }
    });
  }

  function stopScanner() {
    try {
      Quagga.stop();
    } catch(e) {
      // Ignore if not running
    }
    Quagga.offDetected();
  }

  function openScanner(e) {
    if (e) e.preventDefault();
    scannerModal.show();
  }

  function closeScanner(e) {
    if (e) e.preventDefault();
    scannerModal.hide();
  }

  // Torch / Flashlight functionality
  let isTorchOn = false;
  window.toggleQuaggaTorch = async function() {
    const track = Quagga.CameraAccess.getActiveTrack();

    if (track && typeof track.getCapabilities === 'function') {
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        isTorchOn = !isTorchOn;
        try {
          await track.applyConstraints({
            advanced: [{ torch: isTorchOn }]
          });
        } catch (e) {
          console.error("Torch error:", e);
          setStatus("Error toggling torch", true);
        }
      } else {
        console.warn("Torch not supported on this camera.");
        setStatus("Flashlight not supported", true);
        // Put the warning back to default status after a bit
        setTimeout(() => setStatus("Scanning for barcodes..."), 2000);
      }
    }
  };

  // Handle Static Image Uploads via File Input
  const fileInput = document.getElementById("tp-scanner-upload");
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        setStatus("Analyzing image...");
        
        // Create an Object URL to pass to Quagga
        const src = URL.createObjectURL(file);
        
        Quagga.decodeSingle({
          src: src,
          decoder: {
            readers: ["ean_reader", "upc_reader", "code_128_reader"]
          }
        }, function(result) {
          if (result && result.codeResult) {
            const code = result.codeResult.code;
            setSuccess("Found: " + code);
            if (resultDisplay) resultDisplay.textContent = code;
            
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('tp-barcode-scanned', { detail: { code } }));
            }, 500);
            
          } else {
            setStatus("No barcode found in image", true);
          }
          
          // Cleanup
          URL.revokeObjectURL(src);
          // reset input so same file can be selected again
          e.target.value = ''; 
        });
      }
    });
  }

  // Professional Event Delegation: Handle clicks on any scanner trigger, even if added dynamically
  document.addEventListener("click", (e) => {
    // Check for open triggers: data-modal-toggle pointing to our modal OR our legacy data-scanner-open
    const toggleBtn = e.target.closest('[data-modal-toggle="tp-barcode-scanner-modal"], [data-modal-target="tp-barcode-scanner-modal"], [data-scanner-open="true"]');
    if (toggleBtn) {
      e.preventDefault();
      
      const isOnProductsPage = window.location.pathname.includes('/pages/products/');
      if (!isOnProductsPage) {
        window.location.href = '/pages/products/index.html?scan=true';
      } else {
        openScanner();
      }
      return;
    }

    // Check for close triggers
    const hideBtn = e.target.closest('[data-modal-hide="tp-barcode-scanner-modal"], [data-scanner-close="true"]');
    if (hideBtn) {
      e.preventDefault();
      closeScanner();
    }
  });
}
