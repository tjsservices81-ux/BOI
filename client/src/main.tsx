import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AppErrorHandler } from "./utils/errorHandler";
import { SecureNetworkHandler } from "./utils/secureNetworkHandler";

// Initialize error handling and secure networking first
AppErrorHandler.initialize();
SecureNetworkHandler.initialize();

// Preload critical assets immediately
const preloadCriticalAssets = () => {
  const criticalAssets = [
    '/boi_logo.svg',
    '/Icons_Fingerprint.svg',
    '/icon_HID.svg',
    '/IMG_0633_1749764752035.jpeg'
  ];
  
  criticalAssets.forEach(asset => {
    AppErrorHandler.safeExecute(() => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = asset;
      document.head.appendChild(link);
    }, undefined, 'Asset preload');
  });
};

// Ensure fonts are immediately available
const ensureFontsLoaded = () => {
  AppErrorHandler.safeExecute(() => {
    document.fonts.ready.then(() => {
      document.body.classList.add('fonts-loaded');
    });
  }, undefined, 'Font loading');
};

// Initialize optimizations
preloadCriticalAssets();
ensureFontsLoaded();

// Initialize OfflineManager safely after DOM is ready
const initializeOfflineManager = async () => {
  await AppErrorHandler.safeAsyncExecute(async () => {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    const { OfflineManager } = await import('./utils/offlineManager');
    await OfflineManager.initialize();
    console.log('OfflineManager initialized successfully');
  }, undefined, 'OfflineManager initialization');
};

// Initialize in background without blocking app startup
setTimeout(() => initializeOfflineManager(), 100);

createRoot(document.getElementById("root")!).render(<App />);
