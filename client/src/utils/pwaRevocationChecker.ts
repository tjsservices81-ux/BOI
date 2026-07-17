/**
 * PWA-specific revocation checking system
 * Implements aggressive revocation detection for PWA installations
 */

let revocationCheckInterval: NodeJS.Timeout | null = null;

/**
 * Starts aggressive revocation checking for PWA installations
 */
export function startPWARevocationChecker(): void {
  if (revocationCheckInterval) {
    clearInterval(revocationCheckInterval);
  }

  console.log('🔴 Starting aggressive revocation checker - checking every 10 seconds');
  
  // DISABLED: Access code revocation checking removed
  // Only admin deletion (via heartbeat checkCustomerExists) should trigger logout
  // Access code issues should NOT log out existing users
  
  revocationCheckInterval = setInterval(async () => {
    // Revocation checks disabled - users only logout on admin deletion
    console.log('⚠️ PWA revocation checks disabled - heartbeat handles all logout logic');
  }, 10000); // Every 10 seconds
}

/**
 * Checks if running as PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}