import { ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";
import { getAccounts, getTransactions } from "../utils/transactionStore";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [accounts, setAccounts] = useState(getAccounts());
  const [transactions, setTransactions] = useState(getTransactions());

  // Refresh data when component mounts or when returning from transfers
  useEffect(() => {
    const refreshData = () => {
      setAccounts(getAccounts());
      setTransactions(getTransactions());
    };
    
    // Initial load
    refreshData();
    
    // Listen for storage changes (when transfers are made)
    const handleStorageChange = () => {
      refreshData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also refresh on focus (when returning from other pages)
    window.addEventListener('focus', refreshData);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', refreshData);
    };
  }, []);

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header with scenic background matching screenshot exactly */}
      <div className="text-white relative flex-shrink-0 h-44">
        {/* Full scenic background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background.jpg')`
          }}
        />
        {/* Teal overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] opacity-85" />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between px-4 pt-16 pb-4">
            <div className="flex items-center space-x-3">
              <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-5 filter brightness-0 invert" />
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white/40 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-95"
                onClick={() => alert('Profile Menu: Settings, Security, Logout')}
              >
                <User className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="px-4 pb-8 mt-auto">
            <h1 className="text-xl font-normal boi-regular-font">Welcome</h1>
            <p className="text-white/75 text-sm boi-regular-font mt-0.5">Last login: 14.07 GMT 27/04/2021</p>
          </div>
        </div>
      </div>

      {/* Main content area - white card with rounded top corners */}
      <div className="flex-1 px-0 -mt-8 overflow-y-auto ios-scroll">
        <div className="bg-white rounded-t-3xl shadow-lg min-h-full">
          <div className="pt-6 pb-32">
            {/* Dynamic Account List */}
            {accounts.map((account) => (
              <button 
                key={account.id}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-98 haptic-feedback"
                onClick={() => setLocation(`/transactions?account=${account.id}&balance=${account.balance}&number=${account.number.replace('-', '')}`)}
              >
                <div className="text-left">
                  <p className="font-medium text-sm text-gray-800 boi-regular-font">{account.name.toUpperCase()}</p>
                  <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">{account.number}</p>
                </div>
                <div className="flex items-center">
                  <p className="text-lg font-semibold text-[#4a6b75] boi-semibold-font">{account.displayBalance}</p>
                  <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
                </div>
              </button>
            ))}


          </div>
        </div>
      </div>


    </div>
  );
}