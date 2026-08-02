// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { OfflineAuthGuard } from "@/utils/offlineAuthGuard";
import { UserDataManager } from "@/utils/userDataManager";

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

    // Include the current customer number so the server can detect deletion even
    // when there's no server-side session identity (device / invite logins).
    const currentCustomerNumber = UserDataManager.getCurrentUser();

    // Send heartbeat to server to refresh session
    fetch('/api/auth/heartbeat', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessCode && { 'X-Access-Code': accessCode })
      },
      body: JSON.stringify({ accessCode, customerNumber: currentCustomerNumber })
    }).then(response => {
      if (response.status === 410) {
        // 410 Gone = Account PERMANENTLY DELETED - wipe all data for this user
        return response.json().then(data => {
          const customerNumber = data.customerNumber || UserDataManager.getCurrentUser();
          console.log('🔥 ACCOUNT PERMANENTLY DELETED - WIPING ALL USER DATA');
          
          if (customerNumber) {
            // Use the permanent wipe function to clear this user's data specifically
            UserDataManager.permanentlyWipeUserData(customerNumber);
          }
          
          // Redirect to login with permanent deletion message
          window.location.replace('/login?message=Account%20Permanently%20Deleted');
        }).catch(jsonError => {
          console.error('Heartbeat JSON parse error (410):', jsonError);
          // On JSON error, do a full clear as fallback
          localStorage.clear();
          sessionStorage.clear();
          window.location.replace('/login?message=Account%20Permanently%20Deleted');
        });
      } else if (response.status === 401) {
        // Customer was deleted from database (soft delete)
        return response.json().then(data => {
          if (data.logout || data.forceDisconnect) {
            console.log('🔒 CUSTOMER DELETED - FORCING LOGOUT FROM HEARTBEAT');
            
            // Get customer number for targeted wipe
            const customerNumber = data.customerNumber || UserDataManager.getCurrentUser();
            
            // If marked as permanently deleted, wipe their specific data
            if (customerNumber && data.permanentlyDeleted) {
              UserDataManager.permanentlyWipeUserData(customerNumber);
            } else {
              // For soft deletes, do a full clear (user may restore, but need fresh start)
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
            }
            
            // Redirect to login with message
            window.location.href = '/login?message=Account%20Access%20Revoked';
          }
        }).catch(jsonError => {
          // If JSON parsing fails, log error but don't logout (only explicit flags trigger logout)
          console.error('Heartbeat JSON parse error (401):', jsonError);
        });
      }
      // 403 and every other status are deliberately ignored. Deleting the
      // account is the ONLY thing that may sign someone out — access-code
      // revocation, device checks and the like must never do it.
    }).catch(() => {
      // Network/offline errors NEVER sign anyone out. Just keep a backup.
      OfflineAuthGuard.backupUserData();
      console.log('💾 Offline or unreachable - staying logged in');
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

        // No persistence gate: a session is only ever ended by the admin
        // deleting the account, so we always try to restore the user.

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
    // Deliberately does nothing. A session ends only when the admin deletes the
    // account — there is no user-facing or programmatic sign-out.
    console.warn('Sign-out is disabled: sessions end only when an admin deletes the account.');
    return;
  };

  // Kept for the context shape only. Clearing data here would be a sign-out
  // path, which is exactly what must not exist.
  const forceLogout = () => {
    console.warn('forceLogout is disabled: only account deletion ends a session.');
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
