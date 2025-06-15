import { ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import SpendingVisualization from "../components/SpendingVisualization";
import SpendingInsights from "../components/SpendingInsights";
import { UserDataManager } from "../utils/userDataManager";
import { useAuth } from "../lib/auth";

interface Account {
  id: number;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  // Local state for account balances that can be updated by transfers
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Enhanced navigation with smooth animations
  const navigateWithAnimation = (path: string, animationType: 'slide-right' | 'slide-left' | 'slide-up' = 'slide-right') => {
    setIsNavigating(true);
    
    // Add exit animation class to current page
    document.body.classList.add('page-transitioning');
    
    // Small delay for smooth transition
    setTimeout(() => {
      setLocation(path);
      setIsNavigating(false);
      document.body.classList.remove('page-transitioning');
    }, 150);
  };

  // Load accounts using UserDataManager on mount
  useEffect(() => {
    // Ensure there's a current user - if not, set a default
    let currentUser = UserDataManager.getCurrentUser();
    if (!currentUser) {
      // Set a default user if none exists
      currentUser = '12345678';
      UserDataManager.setCurrentUser(currentUser);
      
      // Register default user if they don't exist
      if (!UserDataManager.userExists(currentUser)) {
        UserDataManager.registerUser({
          customerNumber: currentUser,
          name: '',
          email: '',
          phone: '',
          joinDate: '',
          dateCreated: new Date().toISOString()
        });
      }
    }
    
    // Load or initialize accounts with clean default data
    let storedAccounts = UserDataManager.getUserData('bankAccounts', null);
    if (!storedAccounts || storedAccounts.length === 0) {
      // Initialize default accounts with zero balances
      const defaultAccounts = [
        { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "0.00", accountType: "current" },
        { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "0.00", accountType: "credit" },
        { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "0.00", accountType: "savings" },
      ];
      UserDataManager.setUserData('bankAccounts', defaultAccounts);
      storedAccounts = defaultAccounts;
      
      // Initialize empty transactions array
      UserDataManager.setUserData('bankTransactions', []);
    }
    
    setAccounts(storedAccounts);
    
    // Add initialization delay to prevent flash
    setTimeout(() => {
      setIsInitialized(true);
    }, 150);
  }, []);

  // Listen for balance updates from transfers and admin profile updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { accountId, newBalance, accounts: updatedAccounts } = event.detail;
      
      // If updated accounts are provided in the event, use them
      if (updatedAccounts) {
        setAccounts(updatedAccounts);
      } else {
        // Otherwise, refresh from UserDataManager to get latest data
        UserDataManager.clearCache('bankAccounts');
        const freshAccounts = UserDataManager.getUserData('bankAccounts', []);
        if (Array.isArray(freshAccounts) && freshAccounts.length > 0) {
          setAccounts(freshAccounts);
        } else {
          // Fallback to updating individual account
          setAccounts(prev => prev.map(acc => 
            acc.id === accountId ? { ...acc, balance: newBalance } : acc
          ));
        }
      }
    };

    const handleProfileUpdate = async () => {
      // Reload user data when admin updates profile
      const currentUser = UserDataManager.getCurrentUser();
      if (currentUser) {
        try {
          const response = await fetch(`/api/profile/${currentUser}?t=${Date.now()}`);
          if (response.ok) {
            const userData = await response.json();
            // Update UserDataManager with fresh data
            UserDataManager.updateUserProfile({
              name: userData.name,
              email: userData.email,
              phone: userData.phone || "",
              customerNumber: userData.customerNumber,
              dateOfBirth: userData.dateOfBirth || "",
              address: userData.address || "",
              joinDate: userData.joinDate || "Member since 2018"
            });
            
            // Refresh accounts if they may have changed
            const updatedAccounts = UserDataManager.getUserData('bankAccounts', accounts);
            setAccounts(updatedAccounts);
          }
        } catch (error) {
          console.error('Failed to refresh profile data:', error);
        }
      }
    };

    const handleAccountsReset = (event: any) => {
      if (event.detail?.accounts) {
        setAccounts(event.detail.accounts);
        UserDataManager.clearCache();
      }
    };

    window.addEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
    window.addEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('accountsReset', handleAccountsReset as EventListener);
    
    return () => {
      window.removeEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('accountsReset', handleAccountsReset as EventListener);
    };
  }, [accounts]);

  // Store accounts in localStorage for transfer forms to access
  useEffect(() => {
    localStorage.setItem('bankAccounts', JSON.stringify(accounts));
  }, [accounts]);

  // Get color for account type
  const getAccountColor = (accountType: string) => {
    switch (accountType) {
      case 'current': return 'bg-blue-500';
      case 'credit': return 'bg-red-500';
      case 'savings': return 'bg-green-500';
      case 'loan': return 'bg-orange-500';
      case 'deposit': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Show blue screen until fully initialized to prevent flash
  if (!isInitialized) {
    return (
      <div className="h-screen bg-[#106C88] overflow-hidden flex flex-col ios-safe-bottom relative" style={{ maxHeight: '100vh' }}>
        {/* Prevent any content rendering during initialization */}
      </div>
    );
  }

  return (
    <div className={`h-screen bg-[#106C88] overflow-hidden flex flex-col ios-safe-bottom relative page-fade-in ${isNavigating ? 'dashboard-exit' : ''}`} style={{ maxHeight: '100vh' }}>
      {/* Ambient spending visualization background */}
      <SpendingVisualization />
      
      {/* Blue header bar */}
      <div className="bg-[#106C88] flex items-end justify-between px-4 pb-3 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 56px)' }}>
        <div className="flex items-center">
          <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-6 filter brightness-0 invert" />
        </div>
        <div className="flex items-center">
          <button 
            className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-95"
            onClick={() => navigateWithAnimation('/profile', 'slide-up')}
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Header with scenic background */}
      <div className="text-white relative flex-shrink-0 h-36">
        {/* Full scenic background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background.jpg')`
          }}
        />
        
        <div className="relative z-10 h-full flex flex-col justify-center px-4">
          <h1 className="text-2xl font-light mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>Welcome</h1>
          <p className="text-white/90 text-sm font-light" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Last login: {UserDataManager.getLastLoginTime()}
          </p>
        </div>
      </div>

      {/* Main content area - white card with rounded top corners */}
      <div className="flex-1 px-0 -mt-8 overflow-y-auto ios-scroll" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="bg-white rounded-t-3xl shadow-lg min-h-full">
          <div className="pt-6 pb-32" style={{ overscrollBehavior: 'contain' }}>
            {accounts.map((account, index) => (
              <button 
                key={account.id}
                className={`w-full flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-98 haptic-feedback relative stagger-item card-interactive ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => navigateWithAnimation(`/transactions/${account.id}`, 'slide-right')}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Colored side bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getAccountColor(account.accountType)}`}></div>
                
                <div className="flex items-center justify-between w-full px-6 py-4">
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-800 boi-regular-font">{account.displayName.toUpperCase()}</p>
                    <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">{account.accountNumber}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-lg font-semibold text-[#106C88] boi-semibold-font">€{parseFloat(account.balance).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}