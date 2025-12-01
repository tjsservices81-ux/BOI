import { ChevronRight, User, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import SpendingVisualization from "../components/SpendingVisualization";
import SpendingInsights from "../components/SpendingInsights";
import { UserDataManager } from "../utils/userDataManager";
import { StateManager } from "../utils/stateManager";
import { formatCurrency, getUserCurrency, type Currency } from "../utils/currencyUtils";
import ukLogoPath from "@assets/IMG_1505_1759859367310.png";

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
  const [userCurrency, setUserCurrency] = useState<Currency>(() => getUserCurrency());
  
  // Touch-safe interaction state
  const [loadingAccountId, setLoadingAccountId] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const lastTapTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; accountId: number } | null>(null);

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
          pin: '0000',
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
    
    // Load user's currency preference
    setUserCurrency(getUserCurrency());
    
    // Detect touch device
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (navigator as any).msMaxTouchPoints > 0
      );
    };
    checkTouchDevice();
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

    window.addEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
    window.addEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
    window.addEventListener('accountsReset', handleAccountsReset as EventListener);
    window.addEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
    window.addEventListener('transactionDeleted', handleTransactionDeleted as EventListener);
    window.addEventListener('transactionUpdate', handleTransactionDeleted as EventListener);
    window.addEventListener('forceRefresh', handleForceRefresh as EventListener);
    
    return () => {
      window.removeEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate as EventListener);
      window.removeEventListener('accountsReset', handleAccountsReset as EventListener);
      window.removeEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
      window.removeEventListener('transactionDeleted', handleTransactionDeleted as EventListener);
      window.removeEventListener('transactionUpdate', handleTransactionDeleted as EventListener);
      window.removeEventListener('forceRefresh', handleForceRefresh as EventListener);
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

  // Touch-safe navigation with tap guard and loading state
  const handleAccountTap = (accountId: number) => {
    const now = Date.now();
    const TAP_GUARD_MS = 400;
    
    // Ignore rapid repeat taps
    if (now - lastTapTimeRef.current < TAP_GUARD_MS) {
      return;
    }
    
    // Ignore if already loading or navigating
    if (loadingAccountId !== null || isNavigating) {
      return;
    }
    
    // Update state atomically
    lastTapTimeRef.current = now;
    setLoadingAccountId(accountId);
    
    // Navigate after showing loading state
    setTimeout(() => {
      navigateWithAnimation(`/transactions/${accountId}`, 'slide-right');
      // Reset loading state after navigation
      setTimeout(() => setLoadingAccountId(null), 300);
    }, 50);
  };

  // Touch event handlers for drag detection
  const handleTouchStart = (e: React.TouchEvent, accountId: number) => {
    if (isTouchDevice) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        accountId
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, accountId: number) => {
    if (!isTouchDevice || !touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const DRAG_THRESHOLD = 10; // pixels
    
    // Only trigger tap if movement is below threshold
    if (deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD && touchStartRef.current.accountId === accountId) {
      handleAccountTap(accountId);
    }
    
    touchStartRef.current = null;
  };

  const handleTouchMove = () => {
    // Clear touch start on scroll/drag to prevent accidental taps
    if (touchStartRef.current) {
      touchStartRef.current = null;
    }
  };

  return (
    <div className={`page-container h-screen bg-white overflow-hidden flex flex-col ios-safe-bottom relative page-fade-slide-in ${isNavigating ? 'dashboard-exit' : ''}`}>
      {/* Ambient spending visualization background */}
      <SpendingVisualization />
      
      {/* Blue header bar */}
      <div className="bg-[#126987] flex items-end justify-between px-4 pb-3 pt-8 flex-shrink-0" style={{ paddingTop: 'calc(32px + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center">
          <img 
            src={userCurrency === 'GBP' ? ukLogoPath : "/boi_logo.svg"} 
            alt={userCurrency === 'GBP' ? "Bank of Ireland UK" : "Bank of Ireland"} 
            className={`${userCurrency === 'GBP' ? 'h-7' : 'h-6'} filter brightness-0 invert`}
          />
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
        data-scroll-container
        data-scroll-route="/dashboard"
      >
        <div className="bg-white h-full">
          <div className="pt-12 px-4 space-y-6" style={{ overscrollBehavior: 'contain' }}>
            {(accounts && Array.isArray(accounts)) && accounts.map((account, index) => {
              const isLoading = loadingAccountId === account.id;
              const isDisabled = loadingAccountId !== null || isNavigating;
              
              return (
                <button 
                  key={account.id}
                  className={`w-full flex items-center overflow-hidden bg-white shadow-sm border border-gray-100 touch-manipulation relative stagger-item android-no-highlight ${
                    isTouchDevice 
                      ? '' // No hover/pressed on touch devices
                      : 'hover:shadow-md transition-all duration-150 ease-out active:scale-98 card-interactive' // Desktop interactions
                  } ${
                    isDisabled ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={isTouchDevice ? undefined : () => handleAccountTap(account.id)}
                  onTouchStart={isTouchDevice ? (e) => handleTouchStart(e, account.id) : undefined}
                  onTouchEnd={isTouchDevice ? (e) => handleTouchEnd(e, account.id) : undefined}
                  onTouchMove={isTouchDevice ? handleTouchMove : undefined}
                  disabled={isDisabled}
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none'
                  }}
                  data-testid={`account-button-${account.id}`}
                >
                  {/* Colored side bar */}
                  <div className={`w-1 self-stretch ${getAccountColor(account.accountType)}`}></div>
                  
                  <div className="flex items-center justify-between w-full px-5 py-5">
                    <div className="text-left">
                      <p className="text-lg text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>{account.displayName}</p>
                      <p className="text-base text-gray-400 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>~ {account.accountNumber.slice(-4)}</p>
                    </div>
                    <div className="flex items-center">
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 text-[#126987] animate-spin mr-3" data-testid={`loader-${account.id}`} />
                      ) : (
                        <>
                          <p className="text-xl text-[#2d6a7a]" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formatCurrency(account.balance, userCurrency)}</p>
                          <ChevronRight className="h-5 w-5 ml-2 text-[#2d6a7a]" />
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>


    </div>
  );
}