import { ChevronLeft, ChevronRight, Search, Info, Home, ArrowRightLeft, CreditCard, Landmark, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { UserDataManager } from "../utils/userDataManager";
import { getUserCurrency, getCurrencySymbol, formatCurrency } from "../utils/currencyUtils";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: 'debit' | 'credit';
}

export default function Transactions() {
  const locationHook = useLocation();
  const [location, setLocation] = locationHook || ['/', () => {}];
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const accountType = urlParams.get('account') || 'current';
  const initialBalance = parseFloat(urlParams.get('balance') || '2322.40');
  const accountNumber = urlParams.get('number') || '2091';
  
  const [currentBalance, setCurrentBalance] = useState(initialBalance);
  const [dynamicTransactions, setDynamicTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState('transactions');
  const [searchQuery, setSearchQuery] = useState('');

  // Load user-specific transactions and balance
  useEffect(() => {
    const userTransactions = UserDataManager.getUserData(`transactions_${accountType}_${accountNumber}`, []);
    const userBalance = UserDataManager.getUserData(`balance_${accountType}_${accountNumber}`, initialBalance);
    
    setDynamicTransactions(userTransactions);
    setCurrentBalance(userBalance);
  }, [accountType, accountNumber, initialBalance]);

  // Save transactions and balance when they change
  useEffect(() => {
    if (dynamicTransactions.length > 0) {
      UserDataManager.setUserData(`transactions_${accountType}_${accountNumber}`, dynamicTransactions);
    }
    UserDataManager.setUserData(`balance_${accountType}_${accountNumber}`, currentBalance);
  }, [dynamicTransactions, currentBalance, accountType, accountNumber]);

  const getAccountTitle = () => {
    switch (accountType) {
      case 'current': return 'Current Account';
      case 'credit': return 'Credit Card';
      case 'savings': return 'Savings Account';
      case 'loan': return 'Personal Loan';
      case 'deposit': return '365 Monthly Saver';
      default: return 'Current Account';
    }
  };

  const getTransactions = (): Transaction[] => {
    if (dynamicTransactions.length > 0) {
      return dynamicTransactions;
    }
    
    switch (accountType) {
      case 'current':
        return [
          { id: "1", date: "28/11/2025", description: "ATM WITHDRAWAL", amount: 570.00, balance: 2322.40, type: "credit" },
          { id: "2", date: "27/11/2025", description: "DIRECT DEBIT ELECTRIC", amount: -89.50, balance: 1752.40, type: "debit" },
          { id: "3", date: "26/11/2025", description: "ONLINE PURCHASE", amount: -45.99, balance: 1841.90, type: "debit" },
          { id: "4", date: "25/11/2025", description: "SALARY CREDIT", amount: 2800.00, balance: 1887.89, type: "credit" },
          { id: "5", date: "24/11/2025", description: "CARD PAYMENT", amount: -32.45, balance: -912.11, type: "debit" },
          { id: "6", date: "23/11/2025", description: "STANDING ORDER", amount: -1200.00, balance: -879.66, type: "debit" },
        ];
      default:
        return [];
    }
  };

  const transactions = getTransactions().filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header - Simplified with account title centered */}
      <div className="bg-[#2a5f7c] px-4 py-4 flex items-center justify-between flex-shrink-0">
        <button 
          onClick={() => setLocation('/dashboard')}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        
        <h1 className="text-lg font-medium text-white flex-1 text-center">
          {getAccountTitle()} ~ {accountNumber}
        </h1>
        
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
            <span className="text-white text-sm">👤</span>
          </div>
        </button>
      </div>

      {/* Balance and BIC/IBAN section */}
      <div className="bg-[#3d7a93] px-6 py-6 text-white">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-4xl font-bold">{formatCurrency(currentBalance, getUserCurrency())}</span>
          <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>
        
        <div className="border-b border-white/30 mb-4" />
        
        <button className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <span className="text-sm font-medium">BIC / IBAN</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 py-4 flex gap-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
            activeTab === 'transactions'
              ? 'bg-[#2a5f7c] text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('statements')}
          className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
            activeTab === 'statements'
              ? 'bg-[#2a5f7c] text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          Statements
        </button>
        <button
          onClick={() => setActiveTab('more')}
          className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
            activeTab === 'more'
              ? 'bg-[#2a5f7c] text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          More options
        </button>
      </div>

      {/* Filter section */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-600 text-sm">Filter completed transactions</span>
          <Search className="h-5 w-5 text-[#2a5f7c]" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Status heading */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-[#2a5f7c] w-fit">
            <h2 className="text-lg font-medium text-gray-800">Completed</h2>
            <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <Info className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Transaction list */}
        <div className="divide-y divide-gray-100">
          {transactions.map((transaction, index) => (
            <div 
              key={transaction.id}
              className="px-4 py-5 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
              onClick={() => {
                const currencySymbol = getCurrencySymbol(getUserCurrency());
                alert(`Transaction details:\n\nAmount: ${currencySymbol}${Math.abs(transaction.amount).toFixed(2)}\nDate: ${transaction.date}\nBalance: ${currencySymbol}${transaction.balance.toFixed(2)}`);
              }}
            >
              {/* Left side - Reference, IBAN, Date */}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {transaction.id}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  4319401827062009
                </p>
                <p className="text-xs text-gray-500">
                  {transaction.date}
                </p>
              </div>

              {/* Right side - Amount, View details, Chevron */}
              <div className="ml-4 text-right flex items-center gap-3">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${
                    transaction.type === 'credit' 
                      ? 'text-green-600' 
                      : 'text-gray-900'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount), getUserCurrency())}
                  </p>
                  <p className="text-xs text-gray-500 italic">View details</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#2a5f7c]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom banner - Unfamiliar transaction */}
      <div className="bg-[#2a5f7c] px-4 py-4 text-white flex items-center justify-between">
        <span className="text-sm font-medium">See an unfamiliar transaction?</span>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
          <span className="text-sm font-medium">Find out more</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex justify-around items-center flex-shrink-0">
        <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Home className="h-5 w-5 text-gray-700" />
          <span className="text-xs text-gray-600 font-medium">Accounts</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowRightLeft className="h-5 w-5 text-gray-700" />
          <span className="text-xs text-gray-600 font-medium">Payments</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <CreditCard className="h-5 w-5 text-gray-700" />
          <span className="text-xs text-gray-600 font-medium">Cards</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Landmark className="h-5 w-5 text-gray-700" />
          <span className="text-xs text-gray-600 font-medium">Services</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FileText className="h-5 w-5 text-gray-700" />
          <span className="text-xs text-gray-600 font-medium">Apply</span>
        </button>
      </div>
    </div>
  );
}
