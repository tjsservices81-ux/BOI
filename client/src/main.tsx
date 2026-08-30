import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { detectAndHandleDeviceChange } from "./utils/deviceDetection";

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

const ensureFontsLoaded = () => {
  document.fonts.ready.then(() => {
    document.body.classList.add('fonts-loaded');
  });
};

async function initializeApp() {
  await detectAndHandleDeviceChange();
  
  preloadCriticalAssets();
  ensureFontsLoaded();
  
  createRoot(document.getElementById("root")!).render(<App />);
}

if ('serviceWorker' in navigator) {
  // Updates are MANUAL — the customer taps "Download latest update" in the
  // Customer Panel. We intentionally do NOT auto-reload when a new service
  // worker activates or takes control, so a deploy never reloads the app on its
  // own. The only reload here is a one-time recovery if the running bundle is
  // genuinely broken (can't load one of its own chunks).
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_STALE_BUNDLE') {
      if (!sessionStorage.getItem('sw_stale_reloaded')) {
        console.warn('⚠️ Bundle could not load a chunk — reloading once to recover:', event.data.url);
        sessionStorage.setItem('sw_stale_reloaded', '1');
        window.location.reload();
      }
    }
  });
}

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
    const msg = (event.reason as Error).message || '';
    if (msg.includes('Failed to fetch dynamically imported module') || 
        msg.includes('Loading chunk') || 
        msg.includes('Loading CSS chunk')) {
      console.warn('⚠️ Module load failed (likely after update) - reloading...');
      event.preventDefault();
      const hasReloaded = sessionStorage.getItem('sw_update_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('sw_update_reload', 'true');
        window.location.reload();
      } else {
        sessionStorage.removeItem('sw_update_reload');
      }
    }
  }
});

initializeApp();
