// Device Detection System
// Detects when app is running on a different device (e.g., after iPhone restore/transfer)
// It only records a device id. It must NEVER clear stored data: the only
// thing that may end a session is the admin deleting the account.

const DEVICE_ID_KEY = 'app_device_id';

// Generate a random unique device ID
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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
        // First run on this device. Previously this wiped all storage; it must
        // not — only the admin deleting the account may clear a user's data.
        const newDeviceId = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
        console.log('✅ New device ID created (nothing cleared):', newDeviceId);
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
