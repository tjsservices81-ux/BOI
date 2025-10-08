import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { detectAndHandleDeviceChange } from "./utils/deviceDetection";

// Preload critical assets immediately
const preloadCriticalAssets = () => {
  const criticalAssets = [
    '/boi_logo.svg',
    '/Icons_Fingerprint.svg',
    '/icon_HID.svg',
    '/IMG_0633_1749764752035.jpeg'
  ];
  
  criticalAssets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = asset;
    document.head.appendChild(link);
  });
};

// Ensure fonts are immediately available
const ensureFontsLoaded = () => {
  document.fonts.ready.then(() => {
    document.body.classList.add('fonts-loaded');
  });
};

// Initialize app with device detection
async function initializeApp() {
  // CRITICAL: Check for device change FIRST before anything else
  // If running on a new device (after iPhone restore/transfer), this clears all data
  await detectAndHandleDeviceChange();
  
  // Then initialize normal optimizations
  preloadCriticalAssets();
  ensureFontsLoaded();
  
  // Finally render the app
  createRoot(document.getElementById("root")!).render(<App />);
}

// Start the app with device detection
initializeApp();
