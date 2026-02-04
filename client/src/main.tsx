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

// Listen for service worker updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_ACTIVATED') {
      // Show update notification
      console.log('🎉 App updated to v4.5.4!');
      
      // Create a temporary notification banner
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #126987 0%, #0e5a75 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        animation: slideDown 0.3s ease-out;
      `;
      banner.innerHTML = '✅ App Updated to v4.5.4 - Latest Features Active!';
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(banner);
      
      // Remove banner after 4 seconds
      setTimeout(() => {
        banner.style.animation = 'slideDown 0.3s ease-in reverse';
        setTimeout(() => banner.remove(), 300);
      }, 4000);
    }
  });
}

// Start the app with device detection
initializeApp();
