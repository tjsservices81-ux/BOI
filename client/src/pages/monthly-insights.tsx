import { ArrowLeft, User } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { UserDataManager } from "../utils/userDataManager";
import { formatCurrency, getUserCurrency, type Currency } from "../utils/currencyUtils";

export default function MonthlyInsights() {
  const [, setLocation] = useLocation();
  const [userCurrency, setUserCurrency] = useState<Currency>(() => getUserCurrency());
  const [activeTab, setActiveTab] = useState<'out' | 'in'>('out');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState({
    moneyIn: 0,
    moneyOut: 0,
    avgIn: 0,
    avgOut: 0,
    currentMonth: '',
    currentDay: 1
  });

  useEffect(() => {
    setUserCurrency(getUserCurrency());
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Get all transactions
    const mainTransactions = UserDataManager.getUserData('bankTransactions', []);
    const accounts = UserDataManager.getUserData('bankAccounts', []);
    let allTransactions = [...mainTransactions];
    
    accounts.forEach((account: any) => {
      const accountTransactions = UserDataManager.getUserData(`transactions_${account.id}`, []);
      allTransactions = [...allTransactions, ...accountTransactions];
    });
    
    // Filter for current month only
    const currentMonthTransactions = allTransactions.filter((tx: any) => {
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
    
    // Calculate averages (average per day so far this month)
    const avgIn = currentDay > 0 ? moneyIn / currentDay : 0;
    const avgOut = currentDay > 0 ? moneyOut / currentDay : 0;
    
    setMonthlyData({
      moneyIn,
      moneyOut,
      avgIn,
      avgOut,
      currentMonth: monthNames[currentMonth],
      currentDay
    });
  }, []);

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

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#126987] text-white px-4 py-4 flex items-center justify-between">
        <button onClick={() => setLocation('/dashboard')} className="p-1">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          Monthly money in and out
        </h1>
        <button onClick={() => setLocation('/profile')} className="p-1">
          <User className="h-5 w-5" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Intro Section */}
        <div className="bg-white p-5">
          <h2 className="text-2xl text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Here's a breakdown of your activity so far this month
          </h2>
          <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Activity includes transfers between accounts. Your in progress transactions might not be included yet.
          </p>
        </div>

        {/* Account Card */}
        <div className="bg-white mx-4 mt-4 p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#126987" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v12M6 12h12"/>
              </svg>
            </div>
            <div>
              <p className="text-base text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Current</p>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>3704</p>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-gray-200 pt-3">
            <span className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Activity to date:</span>
            <span className="text-base font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {formatCurrency((monthlyData.moneyIn - monthlyData.moneyOut).toFixed(2), userCurrency)}
            </span>
          </div>
        </div>

        {/* Your Activity Section */}
        <div className="bg-white mt-4 p-4">
          <h3 className="text-center text-gray-700 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>Your activity:</h3>
          
          {/* Current Month Tab */}
          <div className="flex justify-center mb-4">
            <div className="px-8 py-2 border-b-2 border-[#126987]">
              <span className="text-gray-800 font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {monthlyData.currentMonth.slice(0, 3)}
              </span>
            </div>
          </div>

          {/* Money Out / Money In Display */}
          <div className="flex justify-between mb-4">
            <div className="text-center flex-1">
              <p className="text-sm font-medium text-[#126987] mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>MONEY OUT</p>
              <p className="text-lg text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {formatCurrency(monthlyData.moneyOut.toFixed(2), userCurrency)}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-sm font-medium text-[#126987] mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>MONEY IN</p>
              <p className="text-lg text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {formatCurrency(monthlyData.moneyIn.toFixed(2), userCurrency)}
              </p>
            </div>
          </div>

          {/* Activity Bar */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              ▸ Activity until the {monthlyData.currentDay}{monthlyData.currentDay === 1 ? 'st' : monthlyData.currentDay === 2 ? 'nd' : monthlyData.currentDay === 3 ? 'rd' : 'th'}
            </p>
            <div className="h-16 flex items-end justify-center space-x-8">
              <div 
                className="w-8 bg-[#126987]" 
                style={{ height: `${Math.min(Math.max((monthlyData.moneyOut / Math.max(monthlyData.moneyOut + monthlyData.moneyIn, 1)) * 100, 10), 100)}%` }}
              ></div>
              <div 
                className="w-8 bg-green-400" 
                style={{ height: `${Math.min(Math.max((monthlyData.moneyIn / Math.max(monthlyData.moneyOut + monthlyData.moneyIn, 1)) * 100, 10), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Average Cards */}
        <div className="flex mx-4 mt-4 space-x-4">
          <div className="flex-1 bg-white p-4 border border-gray-200 text-center">
            <div className="w-12 h-12 mx-auto mb-2 border border-gray-300 rounded flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                <rect x="3" y="6" width="18" height="12" rx="2"/>
                <path d="M12 10v4M10 12h4"/>
                <path d="M12 18v3"/>
                <path d="M9 21h6"/>
              </svg>
            </div>
            <p className="text-xl font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {formatCurrency(monthlyData.avgOut.toFixed(2), userCurrency)}
            </p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Average money out to this point
            </p>
          </div>
          <div className="flex-1 bg-white p-4 border border-gray-200 text-center">
            <div className="w-12 h-12 mx-auto mb-2 border border-gray-300 rounded flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                <rect x="3" y="6" width="18" height="12" rx="2"/>
                <path d="M12 10v4M10 12h4"/>
                <path d="M12 3v3"/>
                <path d="M9 3h6"/>
              </svg>
            </div>
            <p className="text-xl font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {formatCurrency(monthlyData.avgIn.toFixed(2), userCurrency)}
            </p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Average money in to this point
            </p>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex mx-4 mt-4 space-x-4">
          <button
            onClick={() => setActiveTab('out')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'out' 
                ? 'bg-[#126987] text-white' 
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            MONEY OUT
          </button>
          <button
            onClick={() => setActiveTab('in')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'in' 
                ? 'bg-[#126987] text-white' 
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            MONEY IN
          </button>
        </div>

        {/* Transactions Section */}
        <div className="bg-white mx-4 mt-4 p-4 border border-gray-200">
          <h3 className="text-center text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Your {monthlyData.currentMonth} transactions:
          </h3>
          <p className="text-center text-sm text-gray-500 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Tap transaction to recategorise
          </p>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
                  <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
              </div>
              <p className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                No transactions this month
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {tx.description || tx.name || 'Transaction'}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {new Date(tx.date || tx.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-medium ${parseFloat(tx.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(Math.abs(parseFloat(tx.amount)).toFixed(2), userCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="bg-gray-100 mx-4 mt-4 p-4 text-center mb-8">
          <p className="text-gray-700 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Was this insight helpful?
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              className="px-8 py-2 bg-white border border-gray-300 text-gray-700 font-medium"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              YES
            </button>
            <button 
              className="px-8 py-2 bg-white border border-gray-300 text-gray-700 font-medium"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              NO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}