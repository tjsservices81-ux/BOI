import { ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import SpendingVisualization from "../components/SpendingVisualization";
import SpendingInsights from "../components/SpendingInsights";
import { UserDataManager } from "../utils/userDataManager";
import { StateManager } from "../utils/stateManager";
import { CurrencyManager } from "../utils/currencyManager";

interface Account {
  id: number;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Local state for account balances that can be updated by transfers
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState(CurrencyManager.getCurrentCurrency());

  // Enhanced navigation with smooth animations
  const navigateWithAnimation = (path: string, animationType: 'slide-right' | 'slide-left' | 'slide-up' = 'slide-right') => {
    setIsNavigating(true);
    
    // Add page transition classes
    const currentPage = document.querySelector('.page-container') || document.body;
    document.body.classList.add('page-transitioning');
    
    // Add exit animation based on type
    if (animationType === 'slide-right') {
      currentPage.classList.add('page-slide-out-left');
    } else if (animationType === 'slide-left') {
      currentPage.classList.add('page-slide-out-right');
    }
    
    // Navigate after animation starts with cleanup
    const timeoutId = setTimeout(() => {
      setLocation(path);
      setIsNavigating(false);
      document.body.classList.remove('page-transitioning');
      currentPage.classList.remove('page-slide-out-left', 'page-slide-out-right');
    }, 200);
    
    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
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
  }, []);

  // Listen for balance updates from transfers and admin profile updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { accountId, newBalance, accounts: updatedAccounts } = event.detail || {};
      
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

    const handleAccountsUpdate = (event: CustomEvent) => {
      const { accounts: updatedAccounts, source, newAccount } = event.detail || {};
      
      console.log('Dashboard received accountsUpdate:', { source, newAccount, accountsCount: updatedAccounts?.length });
      
      if (updatedAccounts) {
        // Clear cache and force fresh data
        UserDataManager.clearCache('bankAccounts');
        setAccounts(updatedAccounts);
        
        // Also update localStorage for immediate access by other components
        localStorage.setItem('bankAccounts', JSON.stringify(updatedAccounts));
      }
    };

    const handleTransactionDeleted = (event: CustomEvent) => {
      const { accountId, transactions, accounts: updatedAccounts } = event.detail || {};
      
      // Clear cache to ensure fresh data
      UserDataManager.clearCache('bankAccounts');
      UserDataManager.clearCache('bankTransactions');
      
      // Update accounts if provided
      if (updatedAccounts) {
        setAccounts(updatedAccounts);
      } else {
        // Refresh accounts from storage
        const freshAccounts = UserDataManager.getUserData('bankAccounts', []);
        if (Array.isArray(freshAccounts) && freshAccounts.length > 0) {
          setAccounts(freshAccounts);
        }
      }
    };

    const handleForceRefresh = () => {
      // Force complete refresh of all data
      UserDataManager.clearCache();
      const freshAccounts = UserDataManager.getUserData('bankAccounts', []);
      if (Array.isArray(freshAccounts) && freshAccounts.length > 0) {
        setAccounts(freshAccounts);
      }
    };

    const handleCurrencyChange = (event: any) => {
      setCurrentCurrency(event.detail.currency);
    };

    window.addEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
    window.addEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('accountsReset', handleAccountsReset as EventListener);
    window.addEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
    window.addEventListener('transactionDeleted', handleTransactionDeleted as EventListener);
    window.addEventListener('transactionUpdate', handleTransactionDeleted as EventListener);
    window.addEventListener('forceRefresh', handleForceRefresh as EventListener);
    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);
    
    return () => {
      window.removeEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('accountsReset', handleAccountsReset as EventListener);
      window.removeEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
      window.removeEventListener('transactionDeleted', handleTransactionDeleted as EventListener);
      window.removeEventListener('transactionUpdate', handleTransactionDeleted as EventListener);
      window.removeEventListener('forceRefresh', handleForceRefresh as EventListener);
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, [accounts]);

  // Store accounts in localStorage for transfer forms to access
  useEffect(() => {
    localStorage.setItem('bankAccounts', JSON.stringify(accounts));
  }, [accounts]);

  // Handle scroll position persistence
  useEffect(() => {
    // Restore scroll position after component mounts
    StateManager.restoreScrollPosition('/dashboard', '.main-scroll-container');
    
    // Save scroll position on scroll
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        StateManager.saveScrollPosition('/dashboard', scrollContainerRef.current.scrollTop);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

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

  return (
    <div className={`page-container h-screen bg-white overflow-hidden flex flex-col ios-safe-bottom relative page-fade-slide-in ${isNavigating ? 'dashboard-exit' : ''}`} style={{ maxHeight: '100vh' }}>
      {/* Ambient spending visualization background */}
      <SpendingVisualization />
      
      {/* Blue header bar */}
      <div className="bg-[#126987] flex items-end justify-between px-4 pb-3 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 56px)' }}>
        <div className="flex items-center">
          <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-6 filter brightness-0 invert" />
        </div>
        <div className="flex items-center">
          <button 
            className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-95 android-no-highlight"
            onClick={() => navigateWithAnimation('/profile', 'slide-up')}
            style={{
              WebkitTapHighlightColor: 'transparent',
              outline: 'none'
            }}
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
      <div 
        ref={scrollContainerRef}
        className="main-scroll-container flex-1 px-0 -mt-8 overflow-y-auto ios-scroll" 
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        data-scroll-container
        data-scroll-route="/dashboard"
      >
        <div className="bg-white rounded-t-3xl h-full">
          <div className="pt-6 pb-24" style={{ overscrollBehavior: 'contain' }}>
            {(accounts && Array.isArray(accounts)) && accounts.map((account, index) => (
              <button 
                key={account.id}
                className={`w-full flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-98 haptic-feedback relative stagger-item card-interactive android-no-highlight ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => navigateWithAnimation(`/transactions/${account.id}`, 'slide-right')}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none'
                }}
              >
                {/* Colored side bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getAccountColor(account.accountType)}`}></div>
                
                <div className="flex items-center justify-between w-full px-6 py-4">
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-800 boi-regular-font">{account.displayName.toUpperCase()}</p>
                    <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">{account.accountNumber}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-lg font-semibold text-[#126987] boi-semibold-font">{CurrencyManager.formatAmount(account.balance)}</p>
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