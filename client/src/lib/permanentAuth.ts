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

// Validate token with server
export async function validateTokenWithServer(): Promise<any | null> {
  const token = getPermanentToken();
  if (!token) return null;

  try {
    const response = await fetch('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

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

// Login with permanent token
export async function loginWithPermanentAuth(customerNumber: string, pin: string): Promise<any> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customerNumber, pin })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Store permanent token and user data
      if (data.token) {
        storePermanentToken(data.token);
      }
      
      if (data.user) {
        storeUserData(data.user);
      }

      console.log('User logged in with permanent authentication');
      return data;
    } else {
      const error = await response.json();
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Auto-login on app start
export async function autoLoginOnStart(): Promise<any | null> {
  if (!hasPermanentToken()) {
    return null;
  }

  // Check if token is still valid
  const userData = await validateTokenWithServer();
  
  if (userData) {
    console.log('Auto-login successful - user remains authenticated');
    return userData;
  } else {
    console.log('Auto-login failed - token expired or invalid');
    return null;
  }
}

// Make authenticated API requests
export async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getPermanentToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}