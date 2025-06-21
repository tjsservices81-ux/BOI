import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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

// Initialize optimizations
preloadCriticalAssets();
ensureFontsLoaded();

// Initialize OfflineManager safely after DOM is ready
const initializeOfflineManager = async () => {
  try {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    const { OfflineManager } = await import('./utils/offlineManager');
    await OfflineManager.initialize();
    console.log('OfflineManager initialized successfully');
  } catch (error) {
    console.warn('OfflineManager initialization failed, continuing without offline support:', error);
  }
};

// Initialize in background without blocking app startup
setTimeout(() => initializeOfflineManager(), 100);

createRoot(document.getElementById("root")!).render(<App />);
