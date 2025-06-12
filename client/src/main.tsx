import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// iOS fullscreen initialization
const initializeIOSFullscreen = () => {
  // Set initial viewport height
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setVH();
  
  // Handle viewport changes
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => {
    setTimeout(setVH, 100);
  });
  
  // Prevent iOS Safari bounce and zoom
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());
  
  // Handle input focus to prevent zoom
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
};

// Initialize iOS fullscreen behavior
initializeIOSFullscreen();

createRoot(document.getElementById("root")!).render(<App />);
