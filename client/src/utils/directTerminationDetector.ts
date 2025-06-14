// Direct approach: clear session flag on any app exit, detect fresh start by missing flag
export function setupAppTerminationDetection() {
  const APP_RUNNING_FLAG = 'appIsRunning';
  
  // Mark app as running when it starts
  sessionStorage.setItem(APP_RUNNING_FLAG, 'true');
  
  // Clear running flag on any potential termination event
  const clearFlag = () => {
    sessionStorage.removeItem(APP_RUNNING_FLAG);
    console.log('App termination event - clearing running flag');
  };
  
  // Comprehensive event listeners for termination detection
  window.addEventListener('beforeunload', clearFlag);
  window.addEventListener('pagehide', clearFlag);
  window.addEventListener('unload', clearFlag);
  
  // Mobile-specific events
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearFlag();
    }
  });
  
  // Focus events
  window.addEventListener('blur', clearFlag);
  
  // Additional mobile app events
  document.addEventListener('pause', clearFlag);
  document.addEventListener('freeze', clearFlag);
}

export function isAppFreshStart(): boolean {
  const wasRunning = sessionStorage.getItem('appIsRunning') === 'true';
  
  if (!wasRunning) {
    // No running flag = fresh start, clear all state
    sessionStorage.removeItem('splashShown');
    sessionStorage.removeItem('appState');
    sessionStorage.removeItem('appStateValid');
    console.log('Fresh app start detected - clearing all state');
    return true;
  }
  
  console.log('App resume detected - preserving state');
  return false;
}