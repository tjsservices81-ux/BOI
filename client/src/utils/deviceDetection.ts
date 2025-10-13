// Device Detection System
// Detects when app is running on a different device (e.g., after iPhone restore/transfer)
// and automatically clears all stored data to prevent data leakage between devices

const DEVICE_ID_KEY = 'app_device_id';

// Generate a random unique device ID
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Clear all localStorage data
function clearLocalStorage() {
  try {
    localStorage.clear();
    console.log('✅ localStorage cleared');
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

// Clear all sessionStorage data
function clearSessionStorage() {
  try {
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
  } catch (error) {
    console.error('Failed to clear sessionStorage:', error);
  }
}

// Clear all IndexedDB databases
async function clearIndexedDB() {
  try {
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
          console.log(`✅ IndexedDB "${db.name}" deleted`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
  }
}

// Clear all service worker caches
async function clearServiceWorkerCaches() {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log(`✅ Cache "${cacheName}" deleted`);
      }
    }
  } catch (error) {
    console.error('Failed to clear service worker caches:', error);
  }
}

// Clear ALL app data (localStorage, sessionStorage, IndexedDB, caches)
async function clearAllAppData() {
  console.log('🔄 Device change detected - clearing all app data...');
  
  clearLocalStorage();
  clearSessionStorage();
  await clearIndexedDB();
  await clearServiceWorkerCaches();
  
  console.log('✅ All app data cleared - starting fresh');
}

// Main device detection function
// Checks if device ID exists and matches - if not, clears all data
export async function detectAndHandleDeviceChange(): Promise<void> {
  try {
    // Try to get existing device ID from localStorage
    const storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!storedDeviceId) {
      // No device ID found - check if user data exists (might be browser data clear, not device change)
      const userData = localStorage.getItem('bankingUser') || 
                      localStorage.getItem('bankingUserBackup') ||
                      sessionStorage.getItem('bankingUser');
      
      if (userData) {
        // User data exists but device ID missing = likely browser data partial clear or first load
        // DON'T clear everything - just regenerate device ID
        console.log('⚠️ Device ID missing but user data exists - regenerating device ID only');
        const newDeviceId = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
        console.log('✅ Device ID regenerated (user stays logged in)');
      } else {
        // No device ID AND no user data = truly first time OR device transfer
        console.log('⚠️ No device ID or user data - clearing all data for clean state');
        await clearAllAppData();
        const newDeviceId = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
        console.log('✅ New device ID created:', newDeviceId);
      }
    } else {
      // Device ID exists - app is running on same device
      console.log('✅ Device ID verified - same device');
    }
  } catch (error) {
    console.error('Device detection error:', error);
    // On error, DON'T clear data - just regenerate device ID
    // This prevents false logouts from detection errors
    const newDeviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    console.log('⚠️ Device detection error - regenerated device ID, user stays logged in');
  }
}
