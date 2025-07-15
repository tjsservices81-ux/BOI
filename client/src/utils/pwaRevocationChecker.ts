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
  
  // Check every 10 seconds for all installations (enhanced protection)
  revocationCheckInterval = setInterval(async () => {
    const accessCode = getActiveAccessCode();
    
    if (accessCode) {
      try {
        // Direct revocation check
        const response = await fetch('/api/check-revocation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ accessCode })
        });

        console.log(`Revocation check for ${accessCode}: Status ${response.status}`);
        
        if (response.status === 403) {
          const data = await response.json();
          console.log('Revocation response:', data);
          if (data.revoked || data.nuked) {
            console.log('🔴 NUCLEAR REVOCATION DETECTED - Complete destruction initiated');
            await forceLogoutPWA(true);
          }
        } else if (response.ok) {
          const data = await response.json();
          if (data.revoked) {
            console.log('🔴 REVOCATION DETECTED via success response - logging out');
            await forceLogoutPWA(true);
          }
        }
      } catch (error) {
        // Continue checking even if request fails
        console.log('Revocation check failed, continuing...');
      }
    }
  }, 10000); // Every 10 seconds
}

/**
 * Stops the PWA revocation checker
 */
export function stopPWARevocationChecker(): void {
  if (revocationCheckInterval) {
    clearInterval(revocationCheckInterval);
    revocationCheckInterval = null;
  }
}

/**
 * Gets the currently active access code
 */
function getActiveAccessCode(): string | null {
  // Try URL first
  const urlParams = new URLSearchParams(window.location.search);
  let accessCode = urlParams.get('access');
  
  // Try localStorage
  if (!accessCode) {
    accessCode = localStorage.getItem('currentAccessCode');
  }
  
  return accessCode;
}

/**
 * Forces immediate logout for PWA users
 */
async function forceLogoutPWA(nuclear: boolean = false): Promise<void> {
  try {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB if available
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases();
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (error) {
        console.log('Failed to clear IndexedDB:', error);
      }
    }
    
    // Clear service worker caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      } catch (error) {
        console.log('Failed to clear caches:', error);
      }
    }
    
    // Dispatch custom event for components to handle logout
    window.dispatchEvent(new CustomEvent('forceLogout', { 
      detail: { reason: 'accessRevoked' } 
    }));
    
    // Force navigation to access code page
    const urlSuffix = nuclear ? '?nuked=true' : '?revoked=true';
    window.location.replace('/' + urlSuffix);
    
  } catch (error) {
    console.error('Force logout failed:', error);
    // Fallback - just reload
    window.location.reload();
  }
}

/**
 * Checks if running as PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}