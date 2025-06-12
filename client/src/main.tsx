import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// PWA viewport management
function initializePWA() {
  // Set viewport height to prevent browser UI
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => setTimeout(setVH, 100));
  
  // Prevent pull-to-refresh
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const startY = e.touches[0].clientY;
    const element = e.target as Element;
    const scrollableParent = element.closest('.mobile-scroll');
    
    if (!scrollableParent && startY < 50) {
      e.preventDefault();
    }
  }, { passive: false });
  
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const element = e.target as Element;
    const scrollableParent = element.closest('.mobile-scroll');
    
    if (!scrollableParent) {
      e.preventDefault();
    }
  }, { passive: false });
}

initializePWA();

createRoot(document.getElementById("root")!).render(<App />);
