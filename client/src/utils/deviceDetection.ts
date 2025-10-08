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
      // No device ID found - this is either:
      // 1. First time app is opened, OR
      // 2. Data was transferred to a new device
      console.log('⚠️ No device ID found - clearing data and creating new ID');
      
      // Clear all data to ensure clean state
      await clearAllAppData();
      
      // Generate and save new device ID
      const newDeviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
      console.log('✅ New device ID created:', newDeviceId);
    } else {
      // Device ID exists - app is running on same device
      console.log('✅ Device ID verified - same device');
    }
  } catch (error) {
    console.error('Device detection error:', error);
    // On error, play it safe and clear data
    await clearAllAppData();
    const newDeviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  }
}
