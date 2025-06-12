import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// PWA viewport management
function initializePWA() {
  // Set viewport height to prevent browser UI
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Force scroll to hide address bar
    if (window.scrollY === 0) {
      window.scrollTo(0, 1);
      setTimeout(() => window.scrollTo(0, 0), 0);
    }
  }
  
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      setVH();
      window.scrollTo(0, 1);
      setTimeout(() => window.scrollTo(0, 0), 100);
    }, 100);
  });
  
  // Additional viewport forcing
  window.addEventListener('scroll', () => {
    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  });
  
  // Prevent pull-to-refresh and overscroll
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
  
  // Force fullscreen on touch devices
  document.addEventListener('touchend', () => {
    setTimeout(setVH, 0);
  });
}

initializePWA();

createRoot(document.getElementById("root")!).render(<App />);
