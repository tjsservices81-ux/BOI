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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
            console.log('🔒 CUSTOMER DELETED - FORCING LOGOUT FROM HEARTBEAT');
            
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
            
            // Redirect to login with message
            window.location.href = '/login?message=Account%20Access%20Revoked';
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
            
            // Force complete reload to destroy any cached state
            window.location.replace('/?nuked=true');
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
        // Admin deletion - clear everything
        OfflineAuthGuard.clearAllUserData();
        window.location.href = '/login?message=Account%20Access%20Revoked';
      } else {
        // Network error - backup user data and stay logged in
        OfflineAuthGuard.backupUserData();
        console.log('💾 User data backed up - staying logged in offline');
      }
    });
  }, 15000); // Every 15 seconds for faster PWA revocation detection
}

function stopSessionHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

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
    
    // Fallback timeout to prevent infinite loading
    initializationTimer = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('Auth initialization timeout reached, forcing completion');
        setIsLoading(false);
        setIsInitialized(true);
      }
    }, 3000);
    
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
      }}
    >
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
