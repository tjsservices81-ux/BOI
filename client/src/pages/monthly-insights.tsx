import { ArrowLeft, User, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { UserDataManager } from "../utils/userDataManager";
import { formatCurrency, getUserCurrency, type Currency } from "../utils/currencyUtils";

interface Account {
  id: number;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

export default function MonthlyInsights() {
  const [, setLocation] = useLocation();
  const [userCurrency, setUserCurrency] = useState<Currency>(() => getUserCurrency());
  const [activeTab, setActiveTab] = useState<'out' | 'in'>('out');
  const [selectedMonth, setSelectedMonth] = useState<'current' | 'previous'>('current');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>(1);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [monthlyData, setMonthlyData] = useState({
    moneyIn: 0,
    moneyOut: 0,
    avgIn: 0,
    avgOut: 0,
    currentMonth: '',
    currentMonthShort: '',
    previousMonthShort: '',
    currentDay: 1,
    activityToDate: 0
  });

  // Load accounts on mount
  useEffect(() => {
    const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
    setAccounts(storedAccounts);
    if (storedAccounts.length > 0) {
      setSelectedAccountId(storedAccounts[0].id);
    }
  }, []);

  // Calculate data when account changes
  useEffect(() => {
    setUserCurrency(getUserCurrency());
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get transactions based on selected account
    const mainTransactions = UserDataManager.getUserData('bankTransactions', []);
    const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
    let allTransactions = [...mainTransactions];
    
    storedAccounts.forEach((account: any) => {
      const accountTransactions = UserDataManager.getUserData(`transactions_${account.id}`, []);
      allTransactions = [...allTransactions, ...accountTransactions];
    });
    
    // Filter by selected account if not 'all'
    let accountTransactions = allTransactions;
    if (selectedAccountId !== 'all') {
      accountTransactions = allTransactions.filter((tx: any) => 
        tx.accountId === selectedAccountId || tx.account_id === selectedAccountId
      );
    }
    
    // Filter for current month only
    const currentMonthTransactions = accountTransactions.filter((tx: any) => {
      const txDate = new Date(tx.date || tx.timestamp || tx.createdAt);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
    
    setTransactions(currentMonthTransactions);
    
    // Calculate totals
    let moneyIn = 0;
    let moneyOut = 0;
    
    currentMonthTransactions.forEach((tx: any) => {
      let amount = 0;
      if (typeof tx.amount === 'number') {
        amount = tx.amount;
      } else if (typeof tx.amount === 'string') {
        amount = parseFloat(tx.amount.replace(/[^0-9.-]/g, '')) || 0;
      }
      
      if (amount > 0) {
        moneyIn += amount;
      } else {
        moneyOut += Math.abs(amount);
      }
    });
    
    const avgIn = currentDay > 0 ? moneyIn / currentDay : 0;
    const avgOut = currentDay > 0 ? moneyOut / currentDay : 0;
    
    setMonthlyData({
      moneyIn,
      moneyOut,
      avgIn,
      avgOut,
      currentMonth: monthNames[currentMonth],
      currentMonthShort: monthNamesShort[currentMonth],
      previousMonthShort: monthNamesShort[previousMonth],
      currentDay,
      activityToDate: moneyIn - moneyOut
    });
  }, [selectedAccountId]);
  
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const getAccountDisplayName = () => {
    if (selectedAccountId === 'all') return 'All Accounts';
    if (!selectedAccount) return 'Current';
    return selectedAccount.displayName.replace(' Account', '');
  };
  const getAccountNumber = () => {
    if (selectedAccountId === 'all') return '';
    if (!selectedAccount) return '3704';
    return selectedAccount.accountNumber.slice(-4);
  };

  const filteredTransactions = transactions.filter((tx: any) => {
    let amount = 0;
    if (typeof tx.amount === 'number') {
      amount = tx.amount;
    } else if (typeof tx.amount === 'string') {
      amount = parseFloat(tx.amount.replace(/[^0-9.-]/g, '')) || 0;
    }
    
    if (activeTab === 'out') {
      return amount < 0;
    } else {
      return amount > 0;
    }
  });

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: '#F5F7F8', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Top App Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4" style={{ backgroundColor: '#126987', height: '64px' }}>
        <button onClick={() => setLocation('/dashboard')} className="p-2">
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-white font-semibold" style={{ fontSize: '18px' }}>
          Monthly money in and out
        </h1>
        <button 
          onClick={() => setLocation('/profile')} 
          className="p-2 text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-150 ease-out active:scale-95"
          style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
        >
          <User className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Intro Text Section */}
        <div className="bg-white px-6 py-5">
          <h2 className="font-semibold mb-3" style={{ fontSize: '22px', color: '#333', lineHeight: '1.3' }}>
            Here's a breakdown of your activity so far this month
          </h2>
          <p style={{ fontSize: '14px', color: '#777', lineHeight: '1.5' }}>
            Activity includes transfers between accounts. Your in progress transactions might not be included yet.
          </p>
        </div>
        <div style={{ height: '1px', backgroundColor: '#E0E0E0' }}></div>

        {/* Account Summary Card - Tappable */}
        <div className="mx-4 mt-4 bg-white relative" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <button 
            onClick={() => setShowAccountPicker(!showAccountPicker)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center">
              <div className="mr-3">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="12" r="8" stroke="#666" strokeWidth="2" fill="none"/>
                  <ellipse cx="20" cy="20" rx="10" ry="4" stroke="#666" strokeWidth="2" fill="none"/>
                  <ellipse cx="20" cy="28" rx="10" ry="4" stroke="#666" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold" style={{ fontSize: '16px', color: '#333' }}>{getAccountDisplayName()}</p>
                {getAccountNumber() && <p style={{ fontSize: '14px', color: '#777' }}>{getAccountNumber()}</p>}
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${showAccountPicker ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Account Picker Dropdown */}
          {showAccountPicker && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white z-10" style={{ borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setShowAccountPicker(false);
                  }}
                  className="w-full flex items-center p-4 hover:bg-gray-50"
                  style={{ borderBottom: '1px solid #E8E8E8' }}
                >
                  <div className="mr-3">
                    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="12" r="8" stroke="#666" strokeWidth="2" fill="none"/>
                      <ellipse cx="20" cy="20" rx="10" ry="4" stroke="#666" strokeWidth="2" fill="none"/>
                      <ellipse cx="20" cy="28" rx="10" ry="4" stroke="#666" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium" style={{ fontSize: '15px', color: '#333' }}>
                      {account.displayName.replace(' Account', '')}
                    </p>
                    <p style={{ fontSize: '13px', color: '#777' }}>{account.accountNumber.slice(-4)}</p>
                  </div>
                  {selectedAccountId === account.id && (
                    <div className="w-5 h-5 rounded-full bg-[#0A6F85] flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          
          <div style={{ height: '1px', backgroundColor: '#E8E8E8', margin: '0 16px' }}></div>
          <div className="flex justify-between items-center p-4">
            <span style={{ fontSize: '14px', color: '#777' }}>Activity to date:</span>
            <span className="font-bold" style={{ fontSize: '16px', color: '#333' }}>
              {formatCurrency(monthlyData.activityToDate.toFixed(2), userCurrency)}
            </span>
          </div>
        </div>

        {/* Your Activity Section */}
        <div className="mt-4">
          <p className="text-center font-semibold mb-4 px-4" style={{ fontSize: '16px', color: '#333' }}>Your activity:</p>
          
          {/* Current Month Display */}
          <div className="flex justify-center mb-4 px-4">
            <div className="text-center pb-2" style={{ borderBottom: '3px solid #0A6F85' }}>
              <span style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>{monthlyData.currentMonthShort}</span>
            </div>
          </div>

          {/* Money Out / Money In Labels */}
          <div className="flex justify-between px-8 mb-2">
            <div className="text-center">
              <p className="font-semibold" style={{ fontSize: '13px', color: '#0A6F85' }}>MONEY OUT</p>
              <p style={{ fontSize: '16px', color: '#333' }}>
                {formatCurrency(monthlyData.moneyOut.toFixed(2), userCurrency)}
              </p>
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{ fontSize: '13px', color: '#00A651' }}>MONEY IN</p>
              <p style={{ fontSize: '16px', color: '#333' }}>
                {formatCurrency(monthlyData.moneyIn.toFixed(2), userCurrency)}
              </p>
            </div>
          </div>

          {/* Activity Text */}
          <p className="text-center my-3 px-4" style={{ fontSize: '12px', color: '#999' }}>
            ▸ Activity until the {monthlyData.currentDay}{getOrdinalSuffix(monthlyData.currentDay)}
          </p>

          {/* Bar Chart */}
          <div className="flex justify-center items-end mb-4 px-4" style={{ height: '80px' }}>
            <div className="flex items-end space-x-6">
              <div 
                className="w-6" 
                style={{ 
                  backgroundColor: '#0A6F85',
                  height: monthlyData.moneyOut > 0 ? `${Math.max((monthlyData.moneyOut / Math.max(monthlyData.moneyOut + monthlyData.moneyIn, 1)) * 60 + 20, 20)}px` : '20px'
                }}
              ></div>
              <div 
                className="w-6" 
                style={{ 
                  backgroundColor: '#00A651',
                  height: monthlyData.moneyIn > 0 ? `${Math.max((monthlyData.moneyIn / Math.max(monthlyData.moneyOut + monthlyData.moneyIn, 1)) * 60 + 20, 20)}px` : '20px'
                }}
              ></div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#E0E0E0', margin: '0 16px' }}></div>

        {/* Average Money Cards */}
        <div className="flex mx-4 mt-4 bg-white" style={{ borderRadius: '0' }}>
          <div className="flex-1 p-4 text-center" style={{ borderRight: '1px solid #E8E8E8' }}>
            <div className="flex justify-center mb-2">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="6" y="10" width="24" height="16" rx="2" stroke="#666" strokeWidth="1.5" fill="none"/>
                <line x1="12" y1="18" x2="24" y2="18" stroke="#666" strokeWidth="1.5"/>
                <circle cx="18" cy="18" r="3" stroke="#666" strokeWidth="1.5" fill="none"/>
                <path d="M18 26v4M14 30h8" stroke="#666" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className="font-bold" style={{ fontSize: '20px', color: '#333' }}>
              {formatCurrency(monthlyData.avgOut.toFixed(2), userCurrency)}
            </p>
            <p style={{ fontSize: '12px', color: '#777', lineHeight: '1.4' }}>
              Average money out to this point
            </p>
          </div>
          <div className="flex-1 p-4 text-center">
            <div className="flex justify-center mb-2">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="6" y="10" width="24" height="16" rx="2" stroke="#666" strokeWidth="1.5" fill="none"/>
                <line x1="12" y1="18" x2="24" y2="18" stroke="#666" strokeWidth="1.5"/>
                <circle cx="18" cy="18" r="3" stroke="#666" strokeWidth="1.5" fill="none"/>
                <path d="M18 10V6M14 6h8" stroke="#666" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className="font-bold" style={{ fontSize: '20px', color: '#333' }}>
              {formatCurrency(monthlyData.avgIn.toFixed(2), userCurrency)}
            </p>
            <p style={{ fontSize: '12px', color: '#777', lineHeight: '1.4' }}>
              Average money in to this point
            </p>
          </div>
        </div>

        {/* Money Out / Money In Toggle */}
        <div className="flex justify-center space-x-3 mt-6 px-4">
          <button
            onClick={() => setActiveTab('out')}
            className="flex-1 py-3 font-semibold"
            style={{
              backgroundColor: activeTab === 'out' ? '#0A6F85' : '#FFFFFF',
              color: activeTab === 'out' ? '#FFFFFF' : '#0A6F85',
              border: activeTab === 'out' ? 'none' : '2px solid #0A6F85',
              borderRadius: '24px',
              fontSize: '14px'
            }}
          >
            MONEY OUT
          </button>
          <button
            onClick={() => setActiveTab('in')}
            className="flex-1 py-3 font-semibold"
            style={{
              backgroundColor: activeTab === 'in' ? '#0A6F85' : '#FFFFFF',
              color: activeTab === 'in' ? '#FFFFFF' : '#0A6F85',
              border: activeTab === 'in' ? 'none' : '2px solid #0A6F85',
              borderRadius: '24px',
              fontSize: '14px'
            }}
          >
            MONEY IN
          </button>
        </div>

        <div style={{ height: '1px', backgroundColor: '#E0E0E0', margin: '24px 16px 0' }}></div>

        {/* Transactions Section */}
        <div className="px-4 py-6">
          <p className="text-center font-bold mb-1" style={{ fontSize: '16px', color: '#333' }}>
            Your {monthlyData.currentMonth} transactions:
          </p>
          <p className="text-center mb-6" style={{ fontSize: '14px', color: '#777' }}>
            Tap transaction to recategorise
          </p>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex items-center justify-center" style={{ width: '100px', height: '100px', backgroundColor: '#EAEAEA', borderRadius: '50%' }}>
                <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                  <path d="M15 30V15M15 15L10 20M15 15L20 20" stroke="#BBBBBB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M35 20V35M35 35L30 30M35 35L40 30" stroke="#BBBBBB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', color: '#666' }}>
                No transactions this month
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx: any, index: number) => (
                <div key={index} className="bg-white p-4 flex justify-between items-center" style={{ borderRadius: '8px' }}>
                  <div>
                    <p className="font-medium" style={{ fontSize: '15px', color: '#333' }}>
                      {tx.description || tx.name || 'Transaction'}
                    </p>
                    <p style={{ fontSize: '13px', color: '#777' }}>
                      {new Date(tx.date || tx.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold" style={{ color: parseFloat(tx.amount) < 0 ? '#D32F2F' : '#00A651' }}>
                    {formatCurrency(Math.abs(parseFloat(tx.amount)).toFixed(2), userCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="py-5 px-4 mb-20" style={{ backgroundColor: '#EAEAEA' }}>
          <p className="text-center mb-4" style={{ fontSize: '16px', color: '#333' }}>
            Was this insight helpful?
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              className="px-10 py-2 font-semibold"
              style={{ 
                backgroundColor: '#FFFFFF', 
                border: '2px solid #0A6F85', 
                color: '#0A6F85',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              YES
            </button>
            <button 
              className="px-10 py-2 font-semibold"
              style={{ 
                backgroundColor: '#FFFFFF', 
                border: '2px solid #0A6F85', 
                color: '#0A6F85',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              NO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}