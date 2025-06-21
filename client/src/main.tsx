import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Check if access is denied before initializing React
if ((window as any).accessDenied) {
  console.log('Access denied - React app will not initialize');
} else {
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

  // Wait for DOM and access control to complete
  const initializeApp = () => {
    const rootElement = document.getElementById("root");
    if (rootElement && !((window as any).accessDenied)) {
      createRoot(rootElement).render(<App />);
    } else {
      console.log('Root element not found or access denied');
    }
  };

  // Initialize app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}
