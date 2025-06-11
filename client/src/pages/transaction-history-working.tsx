import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ArrowUpRight, CreditCard, Building2, Zap } from "lucide-react";

export default function TransactionHistoryWorking() {
  const [, navigate] = useLocation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>('0.00');

  useEffect(() => {
    const loadData = () => {
      // Get stored transactions
      const storedTransactions = JSON.parse(localStorage.getItem('bankTransactions') || '[]');
      console.log('Loaded transactions:', storedTransactions);
      
      // Get current account balance
      const storedAccounts = JSON.parse(localStorage.getItem('bankAccounts') || '[]');
      const currentAccount = storedAccounts.find((acc: any) => acc.id === 1);
      if (currentAccount) {
        setBalance(currentAccount.balance);
      }
      
      // Combine stored transactions with sample data (recent dates)
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      const sampleTransactions = [
        {
          id: 'sample1',
          amount: '-50.00',
          description: 'ATM WITHDRAWAL DUBLIN',
          timestamp: yesterday.toISOString(),
          type: 'debit'
        },
        {
          id: 'sample2', 
          amount: '-89.50',
          description: 'DIRECT DEBIT ELECTRIC IRELAND',
          timestamp: twoDaysAgo.toISOString(),
          type: 'debit'
        },
        {
          id: 'sample3',
          amount: '-45.99',
          description: 'ONLINE PURCHASE AMAZON.IE',
          timestamp: twoDaysAgo.toISOString(),
          type: 'debit'
        }
      ];
      
      // Format stored transactions
      const formattedStored = storedTransactions.map((tx: any) => ({
        id: tx.id,
        amount: tx.amount,
        description: tx.description,
        timestamp: tx.timestamp,
        type: tx.type
      }));
      
      // Combine and sort by timestamp
      const allTransactions = [...formattedStored, ...sampleTransactions];
      const sortedTransactions = allTransactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setTransactions(sortedTransactions);
    };
    
    loadData();
    
    // Refresh every 2 seconds
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (description: string) => {
    if (description.includes('Transfer')) return ArrowUpRight;
    if (description.includes('ATM')) return CreditCard;
    if (description.includes('ELECTRIC')) return Zap;
    return Building2;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f9fafb'
    }}>
      <div className="bg-[#4a6b75] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate('/')} className="flex items-center text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>Current Account</span>
        </button>
      </div>

      <div className="bg-[#4a6b75] text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90" style={{ fontFamily: 'OpenSans, sans-serif' }}>Account ending -2091</p>
            <p className="text-xs opacity-75" style={{ fontFamily: 'OpenSans, sans-serif' }}>Available Balance</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{balance}</p>
          </div>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        padding: '1rem'
      }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          Recent Transactions
        </h2>

        <div className="space-y-1">
          {transactions.map((transaction, index) => {
            const IconComponent = getIcon(transaction.description);
            const isDebit = transaction.type === 'debit' || transaction.amount.startsWith('-');
            
            return (
              <div key={`${transaction.id}-${index}`} className="bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center flex-1">
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {formatDate(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${isDebit ? 'text-gray-900' : 'text-green-600'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    €{transaction.amount}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex space-x-4 mt-8">
          <button 
            onClick={() => navigate('/uk-transfer')}
            className="flex-1 bg-[#4a6b75] text-white py-3 rounded-lg font-semibold text-sm"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Transfer
          </button>
          <button 
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold text-sm"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Pay Bills
          </button>
        </div>
      </div>
    </div>
  );
}