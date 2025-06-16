import { ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import SpendingVisualization from "../components/SpendingVisualization";
import SpendingInsights from "../components/SpendingInsights";
import { UserDataManager } from "../utils/userDataManager";
import { StateManager } from "../utils/stateManager";

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
    
    // Navigate after animation starts
    setTimeout(() => {
      setLocation(path);
      setIsNavigating(false);
      document.body.classList.remove('page-transitioning');
      currentPage.classList.remove('page-slide-out-left', 'page-slide-out-right');
    }, 200);
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
    
    // Load or initialize accounts with Bank of Ireland sample data
    let storedAccounts = UserDataManager.getUserData('bankAccounts', null);
    if (!storedAccounts || storedAccounts.length === 0) {
      // Initialize default accounts with Bank of Ireland sample balances
      const defaultAccounts = [
        { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "135.02", accountType: "current" },
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

    const handleAccountsUpdate = (event: CustomEvent) => {
      const { accounts: updatedAccounts, source, newAccount } = event.detail;
      
      console.log('Dashboard received accountsUpdate:', { source, newAccount, accountsCount: updatedAccounts?.length });
      
      if (updatedAccounts) {
        // Clear cache and force fresh data
        UserDataManager.clearCache('bankAccounts');
        setAccounts(updatedAccounts);
        
        // Also update localStorage for immediate access by other components
        localStorage.setItem('bankAccounts', JSON.stringify(updatedAccounts));
      }
    };

    window.addEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
    window.addEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('accountsReset', handleAccountsReset as EventListener);
    window.addEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('accountsReset', handleAccountsReset as EventListener);
      window.removeEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
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
      {/* Blue header bar */}
      <div className="bg-[#0d5e73] flex items-end justify-between px-4 pb-3 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 56px)' }}>
        <div className="flex items-center">
          <span className="text-white text-lg font-medium">Bank of Ireland</span>
          <div className="ml-2 flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
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
      <div className="text-white relative flex-shrink-0 h-32">
        {/* Blue gradient background with subtle overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#0d5e73] via-[#1a7a92] to-[#2596be]"
        />
        
        <div className="relative z-10 h-full flex flex-col justify-center px-4">
          <h1 className="text-2xl font-light mb-1">Welcome</h1>
          <p className="text-white/80 text-sm font-light">
            Last login: {UserDataManager.getLastLoginTime()}
          </p>
        </div>
      </div>

      {/* Main content area - clean white background */}
      <div 
        ref={scrollContainerRef}
        className="main-scroll-container flex-1 bg-gray-50 overflow-auto" 
        style={{ maxHeight: 'calc(100vh - 176px)' }}
        data-scroll-container
        data-scroll-route="/dashboard"
      >
        <div className="px-0 pb-32">
          {accounts.map((account, index) => (
            <button 
              key={account.id}
              className={`w-full bg-white flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-98 ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => navigateWithAnimation(`/transactions/${account.id}`, 'slide-right')}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between w-full px-4 py-5">
                <div className="text-left">
                  <p className="font-medium text-[15px] text-gray-900 mb-1">{account.displayName.toUpperCase()}</p>
                  <p className="text-[13px] text-gray-500">{account.accountNumber}</p>
                </div>
                <div className="flex items-center">
                  <p className="text-[18px] font-medium text-[#0d5e73]">€{parseFloat(account.balance).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <ChevronRight className="h-5 w-5 ml-3 text-gray-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}