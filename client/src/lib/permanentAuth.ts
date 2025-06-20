// Permanent Authentication System - Client Side
// Users stay logged in forever until admin deletes their token

const PERMANENT_TOKEN_KEY = 'banking_permanent_token';
const USER_DATA_KEY = 'banking_user_data';

// Store permanent token in localStorage (never expires)
export function storePermanentToken(token: string): void {
  localStorage.setItem(PERMANENT_TOKEN_KEY, token);
  console.log('Permanent token stored - user will stay logged in indefinitely');
}

// Get permanent token from localStorage
export function getPermanentToken(): string | null {
  return localStorage.getItem(PERMANENT_TOKEN_KEY);
}

// Store user data permanently
export function storeUserData(userData: any): void {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

// Get stored user data
export function getStoredUserData(): any | null {
  const data = localStorage.getItem(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

// Clear all authentication data (admin only)
export function clearPermanentAuth(): void {
  localStorage.removeItem(PERMANENT_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  console.log('Permanent authentication cleared by admin');
}

// Check if user has permanent token
export function hasPermanentToken(): boolean {
  return getPermanentToken() !== null;
}

// Validate token with server - optimized for both iOS and Android
export async function validateTokenWithServer(): Promise<any | null> {
  const token = getPermanentToken();
  if (!token) return null;

  try {
    // Add timeout for mobile network reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const userData = await response.json();
      storeUserData(userData);
      return userData;
    } else {
      // Token invalid - clear local storage
      clearPermanentAuth();
      return null;
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

// Login with permanent authentication - cross-platform optimized
export async function loginWithPermanentAuth(customerNumber: string, pin: string): Promise<any> {
  try {
    // Add timeout for mobile network reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerNumber,
        pin,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      // Store permanent token and user data
      if (data.permanentToken) {
        storePermanentToken(data.permanentToken);
        storeUserData(data.user);
        console.log('Permanent authentication established - user will stay logged in indefinitely');
      }
      
      return data;
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Auto-login on app start - cross-platform compatible
export async function autoLoginOnStart(): Promise<any | null> {
  if (!hasPermanentToken()) {
    return null;
  }

  try {
    const userData = await validateTokenWithServer();
    if (userData) {
      console.log('Auto-login successful - permanent authentication restored');
      return userData;
    }
  } catch (error) {
    console.error('Auto-login failed:', error);
  }

  return null;
}