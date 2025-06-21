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

// Initialize offline support
import { OfflineManager } from './utils/offlineManager'

// Initialize optimizations and offline support
preloadCriticalAssets();
ensureFontsLoaded();

// Initialize OfflineManager
OfflineManager.initialize().catch(error => {
  console.error('Failed to initialize offline manager:', error)
})

createRoot(document.getElementById("root")!).render(<App />);
