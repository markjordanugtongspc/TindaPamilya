import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
];

const BOX_WIDTH = 320; 
const BOX_HEIGHT = 160; 

export function createBarcodeScanner(readerId, onStatus) {
  let scanner = null;
  let active = false;
  let lastError = "";

  const safeStatus = (text) => {
    if (typeof onStatus === "function") onStatus(text);
  };

  const getReaderElement = () => document.getElementById(readerId);

  const toggleFullScreen = async (enable) => {
    // Only auto-fullscreen on Desktop/Large Tablets, skip for mobile
    if (window.innerWidth < 768) return;

    const el = getReaderElement();
    if (!el) return;
    try {
      if (enable) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("[Fullscreen Policy]", "Skipped/Blocked.", err);
    }
  };

  const stop = async () => {
    if (!scanner) return;
    try {
      await toggleFullScreen(false);
      if (active) await scanner.stop();
      await scanner.clear();
    } catch (err) {
      console.warn("[Scanner Cleanup]", err);
    } finally {
      scanner = null;
      active = false;
      safeStatus("Scanner idle.");
    }
  };

  const getScanner = () => {
    if (!scanner) {
      scanner = new Html5Qrcode(readerId, { 
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false 
      });
    }
    return scanner;
  };

  const start = async () => {
    if (active) return;
    const readerEl = getReaderElement();
    if (readerEl) readerEl.innerHTML = "";

    safeStatus("Initializing HD Lens...");
    const sc = getScanner();
    active = true;

    // Detect Windows Desktop to use Front Camera vs Mobile Environment
    const isWindows = navigator.platform.indexOf('Win') > -1;
    const facingMode = isWindows ? "user" : "environment";

    const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        let minEdgePercentage = 0.8; 
        let width = viewfinderWidth * minEdgePercentage;
        let height = viewfinderHeight * minEdgePercentage;
        if (width > BOX_WIDTH) width = BOX_WIDTH;
        if (height > BOX_HEIGHT) height = BOX_HEIGHT;
        return { width: Math.floor(width), height: Math.floor(height) };
    };

    try {
      await toggleFullScreen(true);

      await sc.start(
        { facingMode: facingMode },
        {
          fps: 25,
          qrbox: qrboxFunction,
          aspectRatio: 1.0,
          // Force HD Quality
          videoConstraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: facingMode
          }
        },
        async (decodedText) => {
          console.log("%c 🎉 CAPTURED: " + decodedText, "background: #10b981; color: #fff; padding: 5px;");
          await stop(); 
          safeStatus(`Scanned Output: ${decodedText}`);
        },
        (errorMessage) => {
          if (errorMessage !== lastError) {
              lastError = errorMessage;
              console.log("🔍 Scanning...", errorMessage);
          }
        },
      );
      
      safeStatus("Full-Screen HD Mode Active.");

    } catch (error) {
      active = false;
      await toggleFullScreen(false);
      console.error("[SCANNER ERROR]", error);
      safeStatus(`Error: ${error.message}`);
    }
  };

  const scanFile = async (imageFile) => {
    if (!imageFile) return;
    if (active) await stop();
    const sc = getScanner();
    safeStatus("Processing File...");
    try {
      const decodedText = await sc.scanFile(imageFile, true);
      safeStatus(`Output: ${decodedText}`);
      return decodedText;
    } catch (err) {
      safeStatus("No barcode found in image.");
      throw err;
    }
  };

  return { start, stop, scanFile };
}
