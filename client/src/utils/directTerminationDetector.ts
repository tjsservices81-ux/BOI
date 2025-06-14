// Improved termination detection - only clear flag on actual termination
export function setupAppTerminationDetection() {
  const APP_RUNNING_FLAG = 'appIsRunning';
  
  // Mark app as running when it starts
  sessionStorage.setItem(APP_RUNNING_FLAG, 'true');
  
  // Clear running flag only on definitive termination events
  const clearFlag = () => {
    sessionStorage.removeItem(APP_RUNNING_FLAG);
    console.log('App termination event - clearing running flag');
  };
  
  // Only listen for definitive termination events
  window.addEventListener('beforeunload', clearFlag);
  window.addEventListener('unload', clearFlag);
  
  // For mobile PWAs - only clear on pagehide if the page is being discarded
  window.addEventListener('pagehide', (event) => {
    // Only clear if the page is being permanently discarded
    if (!event.persisted) {
      clearFlag();
    }
  });
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