// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { OfflineAuthGuard } from "@/utils/offlineAuthGuard";

interface User {
  id: number;
  name: string;
  email: string;
  customerNumber: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
  isAccountDeleted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Callback to set account deleted state from heartbeat
let setAccountDeletedCallback: ((deleted: boolean) => void) | null = null;

// Global function to trigger account deleted screen from anywhere
export function triggerAccountDeletedScreen() {
  if (setAccountDeletedCallback) {
    setAccountDeletedCallback(true);
  }
}

// Make it available globally for non-React code
if (typeof window !== 'undefined') {
  (window as any).triggerAccountDeletedScreen = triggerAccountDeletedScreen;
}

// Session heartbeat to maintain activity
let heartbeatInterval: NodeJS.Timeout | null = null;

function startSessionHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    localStorage.setItem('lastSessionActivity', Date.now().toString());
    
    // Get current access code for revocation checking
    const urlParams = new URLSearchParams(window.location.search);
    const accessCode = urlParams.get('access') || localStorage.getItem('currentAccessCode');
    
    // Send heartbeat to server to refresh session
    fetch('/api/auth/heartbeat', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessCode && { 'X-Access-Code': accessCode })
      },
      body: JSON.stringify({ accessCode })
    }).then(response => {
      if (response.status === 401) {
        // Customer was deleted from database
        return response.json().then(data => {
          if (data.logout || data.forceDisconnect) {
            console.log('🔒 CUSTOMER DELETED - SHOWING ACCOUNT DELETED SCREEN');
            
            // Set account deleted state to show full-screen overlay
            if (setAccountDeletedCallback) {
              setAccountDeletedCallback(true);
            }
            
            // Clear all session data
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear all caches
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
            
            // Clear IndexedDB
            if ('indexedDB' in window) {
              indexedDB.databases().then(databases => {
                databases.forEach(db => {
                  if (db.name) indexedDB.deleteDatabase(db.name);
                });
              }).catch(() => {});
            }
            
            // Don't redirect - show full-screen deleted overlay instead
          }
        }).catch(jsonError => {
          // If JSON parsing fails, log error but don't logout (only explicit flags trigger logout)
          console.error('Heartbeat JSON parse error (401):', jsonError);
        });
      } else if (response.status === 403) {
        // CRITICAL: Only logout if response explicitly has forceDisconnect/nukeCaches flags
        // Generic 403 responses (from middleware, guards, etc.) should NOT trigger logout
        return response.json().then(data => {
          // Only process logout if explicit flags are present
          if (data && (data.forceDisconnect === true || data.nukeCaches === true)) {
            console.log('🔴 EXPLICIT REVOCATION - Destroying session with logout flags');
            
            // Nuclear data clearing for PWA apps
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear all possible caches
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
            
            // Clear IndexedDB
            if ('indexedDB' in window) {
              indexedDB.databases().then(databases => {
                databases.forEach(db => {
                  if (db.name) indexedDB.deleteDatabase(db.name);
                });
              }).catch(() => {});
            }
            
            // Set account deleted state to show full-screen overlay
            if (setAccountDeletedCallback) {
              setAccountDeletedCallback(true);
            }
          } else {
            // 403 without explicit logout flags - ignore and stay logged in
            console.log('⚠️ 403 response without logout flags - staying logged in');
          }
        }).catch(jsonError => {
          // If JSON parsing fails, it's not a logout response - stay logged in
          console.log('⚠️ 403 with malformed JSON - staying logged in');
        });
      }
    }).catch((error) => {
      // Handle network failures - user stays logged in unless admin deletion
      const action = OfflineAuthGuard.handleNetworkFailure(error);
      
      if (action === 'logout') {
        // Admin deletion - clear everything and show deleted screen
        OfflineAuthGuard.clearAllUserData();
        if (setAccountDeletedCallback) {
          setAccountDeletedCallback(true);
        }
      } else {
        // Network error - backup user data and stay logged in
        OfflineAuthGuard.backupUserData();
        console.log('💾 User data backed up - staying logged in offline');
      }
    });
  }, 5000); // Every 5 seconds for instant account deletion detection
}

function stopSessionHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Full-screen Account Deleted Overlay Component
function AccountDeletedOverlay() {
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ 
        background: 'linear-gradient(135deg, #1a5490 0%, #0d3a6a 100%)',
        fontFamily: 'OpenSans, sans-serif'
      }}
    >
      <div className="text-center px-8 max-w-md">
        {/* Bank Logo */}
        <div className="mb-8">
          <img 
            src="/boi_logo.svg" 
            alt="Bank of Ireland" 
            className="h-16 mx-auto mb-4"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        
        {/* Deleted Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        {/* Message */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Account Deleted
        </h1>
        <p className="text-white/80 text-lg mb-8">
          Your account has been removed by an administrator. If you believe this was done in error, please contact customer support.
        </p>
        
        {/* Contact Info */}
        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <p className="text-white/60 text-sm mb-1">Customer Support</p>
          <p className="text-white font-semibold">1800 946 764</p>
        </div>
        
        {/* Reload Button */}
        <button
          onClick={() => {
            // Clear everything and reload
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          }}
          className="w-full py-4 bg-white text-[#1a5490] rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);
  
  // Register the callback for heartbeat to use
  useEffect(() => {
    setAccountDeletedCallback = setIsAccountDeleted;
    return () => {
      setAccountDeletedCallback = null;
    };
  }, []);

  // Initialize auth state on mount - check for valid session
  useEffect(() => {
    let isMounted = true;
    let initializationTimer: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        // Initialize offline auth guard
        OfflineAuthGuard.initialize();
        
        // Check if auth should persist
        if (!OfflineAuthGuard.shouldPersistAuth()) {
          console.log('Auth persistence disabled - clearing session');
          if (isMounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
          return;
        }
        
        // Try to restore user from any available storage
        let foundUser = OfflineAuthGuard.restoreUserData();
        
        // Fallback to legacy storage check
        if (!foundUser) {
          try {
            const cachedUser = localStorage.getItem('bankingUser');
            if (cachedUser) {
              foundUser = JSON.parse(cachedUser);
              // Save to new system if valid user data
              if (foundUser && foundUser.id && foundUser.customerNumber) {
                OfflineAuthGuard.saveUserData(foundUser);
              }
            }
          } catch (error) {
            console.warn('Legacy storage check failed:', error);
          }
        }
        
        if (foundUser && isMounted) {
          setUser(foundUser);
          // Update activity timestamp
          localStorage.setItem('lastSessionActivity', Date.now().toString());
          localStorage.setItem('bankingSessionActive', 'true');
          // Start heartbeat to maintain session
          startSessionHeartbeat();
          // Backup user data
          OfflineAuthGuard.backupUserData();
        }
        
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Auth initialization error, preserving existing state:', error);
        if (isMounted) {
          // Don't wipe user state on initialization errors
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Start initialization immediately
    initializeAuth();
    
    // Fallback timeout to prevent infinite loading (15 seconds to allow slow networks)
    initializationTimer = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('Auth initialization timeout reached, forcing completion');
        setIsLoading(false);
        setIsInitialized(true);
      }
    }, 15000);
    
    return () => {
      isMounted = false;
      if (initializationTimer) {
        clearTimeout(initializationTimer);
      }
    };
  }, []);

  // Listen for admin profile updates to refresh user data immediately
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (user && customEvent.detail) {
        const updatedUser = {
          id: user.id,
          name: customEvent.detail.name || user.name,
          email: customEvent.detail.email || user.email,
          customerNumber: user.customerNumber
        };
        
        // Update user state immediately without flickering
        setUser(updatedUser);
        localStorage.setItem('bankingUser', JSON.stringify(updatedUser));
      }
    };

    window.addEventListener('adminProfileUpdate', handleProfileUpdate);
    window.addEventListener('userProfileUpdate', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate);
    };
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    
    // Store user data with multiple persistence mechanisms
    const userDataWithTimestamp = {
      ...userData,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      persistentSession: true
    };
    
    // Save to offline auth guard (multi-location backup)
    OfflineAuthGuard.saveUserData(userDataWithTimestamp);
    
    // Legacy storage for compatibility
    localStorage.setItem('bankingUser', JSON.stringify(userDataWithTimestamp));
    
    // Set session activity tracker
    localStorage.setItem('bankingSessionActive', 'true');
    localStorage.setItem('lastSessionActivity', Date.now().toString());
    
    // Start activity heartbeat to maintain session
    startSessionHeartbeat();
  };

  const logout = async () => {
    // Only admin can force logout - otherwise sessions persist indefinitely
    console.warn('Standard logout disabled - sessions persist until admin deletion');
    
    // Stop heartbeat but keep session data
    stopSessionHeartbeat();
    
    // Mark session as inactive but don't clear data
    localStorage.setItem('bankingSessionActive', 'false');
    localStorage.setItem('lastSessionActivity', Date.now().toString());
    
    // Clear offline login permissions on logout attempt
    try {
      const { SecureAuthManager } = await import('../utils/secureAuthManager');
      SecureAuthManager.clearOfflineLoginPermissions();
    } catch (error) {
      console.error('Failed to clear offline permissions:', error);
    }
    
    return;
  };

  // Admin-only function to force complete logout
  const forceLogout = () => {
    stopSessionHeartbeat();
    setUser(null);
    
    // Use offline auth guard to clear all data
    OfflineAuthGuard.clearAllUserData();
    
    // Clear additional session markers
    localStorage.removeItem('bankingSessionActive');
    localStorage.removeItem('lastSessionActivity');
    
    // Clear offline permissions
    try {
      import('../utils/secureAuthManager').then(({ SecureAuthManager }) => {
        SecureAuthManager.clearOfflineLoginPermissions();
      });
    } catch (error) {
      console.error('Failed to clear offline permissions:', error);
    }
  };

  // Expose forceLogout for admin use
  if (typeof window !== 'undefined') {
    (window as any).forceLogout = forceLogout;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        isAccountDeleted,
      }}
    >
      {isAccountDeleted && <AccountDeletedOverlay />}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
