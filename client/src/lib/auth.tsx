// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  name: string;
  email: string;
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
      if (response.status === 403) {
        return response.json().then(data => {
          if (data.forceDisconnect || data.nukeCaches) {
            console.log('🔴 NUCLEAR ACCESS REVOCATION - Destroying PWA session completely');
            
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
          }
        });
      }
    }).catch(() => {
      // Ignore heartbeat failures - user stays logged in locally
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
        // Check multiple storage locations for user data
        // Users stay logged in permanently until admin deletion
        let foundUser = null;
        
        // Try primary localStorage
        try {
          const cachedUser = localStorage.getItem('bankingUser');
          if (cachedUser) {
            try {
              foundUser = JSON.parse(cachedUser);
            } catch (parseError) {
              console.warn('Primary storage parse failed, trying backup');
            }
          }
        } catch (storageError) {
          console.warn('Primary localStorage access failed');
        }
        
        // Try backup localStorage if primary failed
        if (!foundUser) {
          try {
            const backupUser = localStorage.getItem('bankingUserBackup');
            if (backupUser) {
              foundUser = JSON.parse(backupUser);
              // Restore to primary storage
              localStorage.setItem('bankingUser', backupUser);
            }
          } catch (error) {
            console.warn('Backup localStorage access failed');
          }
        }
        
        // Try sessionStorage as last resort
        if (!foundUser) {
          try {
            const sessionUser = sessionStorage.getItem('bankingUser');
            if (sessionUser) {
              foundUser = JSON.parse(sessionUser);
              // Restore to localStorage
              localStorage.setItem('bankingUser', sessionUser);
              localStorage.setItem('bankingUserBackup', sessionUser);
            }
          } catch (error) {
            console.warn('SessionStorage access failed');
          }
        }
        
        if (foundUser && isMounted) {
          setUser(foundUser);
          // Update activity timestamp
          localStorage.setItem('lastSessionActivity', Date.now().toString());
          localStorage.setItem('bankingSessionActive', 'true');
          // Start heartbeat to maintain session
          startSessionHeartbeat();
          // Reset parse failure counter on success
          localStorage.removeItem('bankingUser_parseFailures');
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
          email: customEvent.detail.email || user.email
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
    
    // Primary storage - localStorage (permanent)
    localStorage.setItem('bankingUser', JSON.stringify(userDataWithTimestamp));
    
    // Secondary storage - sessionStorage (browser session backup)
    sessionStorage.setItem('bankingUser', JSON.stringify(userDataWithTimestamp));
    
    // Tertiary storage - localStorage backup with different key
    localStorage.setItem('bankingUserBackup', JSON.stringify(userDataWithTimestamp));
    
    // Set session activity tracker
    localStorage.setItem('bankingSessionActive', 'true');
    localStorage.setItem('lastSessionActivity', Date.now().toString());
    
    // Reset parse failure counter on successful login
    localStorage.removeItem('bankingUser_parseFailures');
    
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
    
    // Clear all storage locations
    localStorage.removeItem('bankingUser');
    localStorage.removeItem('bankingUserBackup');
    localStorage.removeItem('bankingSessionActive');
    localStorage.removeItem('lastSessionActivity');
    sessionStorage.removeItem('bankingUser');
    
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
