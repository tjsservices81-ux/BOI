import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, ShoppingCart, Car, Zap, Building2, CreditCard } from "lucide-react";

interface SimpleTransaction {
  id: string;
  amount: string;
  description: string;
  reference: string;
  timestamp: string;
  type: 'debit' | 'credit';
}

export default function TransactionHistorySimple() {
  const [, navigate] = useLocation();
  const [transactions, setTransactions] = useState<SimpleTransaction[]>([]);
  const [balance, setBalance] = useState<string>('0.00');

  useEffect(() => {
    const loadData = () => {
      console.log('=== LOADING TRANSACTION DATA ===');
      
      // Get stored transactions
      const stored = localStorage.getItem('bankTransactions');
      console.log('Raw stored data:', stored);
      
      let storedTransactions = [];
      if (stored) {
        try {
          storedTransactions = JSON.parse(stored);
          console.log('Parsed transactions:', storedTransactions);
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
      
      // Convert to simple format
      const simpleTransactions = storedTransactions.map((t: any) => ({
        id: t.id.toString(),
        amount: t.amount,
        description: t.description,
        reference: t.reference,
        timestamp: t.timestamp,
        type: t.type
      }));
      
      // Force add test transaction to verify display works
      const testTransaction = {
        id: 'test123',
        amount: '-20.00',
        description: 'TEST: UK Transfer to James',
        reference: 'BOI06460236W26R',
        timestamp: new Date().toISOString(),
        type: 'debit' as const
      };
      
      simpleTransactions.unshift(testTransaction);
      
      // Add sample data
      const samples = [
        {
          id: 'sample1',
          amount: '-50.00',
          description: 'ATM WITHDRAWAL DUBLIN',
          reference: 'ATM240427',
          timestamp: '2021-04-27T14:30:00.000Z',
          type: 'debit' as const
        },
        {
          id: 'sample2',
          amount: '-89.50',
          description: 'DIRECT DEBIT ELECTRIC IRELAND',
          reference: 'DD240426',
          timestamp: '2021-04-26T08:15:00.000Z',
          type: 'debit' as const
        }
      ];
      
      console.log('Simple transactions:', simpleTransactions);
      console.log('Sample transactions:', samples);
      
      const allTransactions = [...simpleTransactions, ...samples];
      console.log('Combined transactions:', allTransactions);
      
      // Sort by timestamp
      const sortedTransactions = allTransactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      console.log('Final sorted transaction list:', sortedTransactions);
      
      setTransactions(sortedTransactions);
      
      // Get balance
      const accounts = localStorage.getItem('bankAccounts');
      if (accounts) {
        const parsed = JSON.parse(accounts);
        const currentAccount = parsed.find((acc: any) => acc.id === 1);
        if (currentAccount) {
          setBalance(currentAccount.balance);
        }
      }
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
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-white">
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

        <div className="space-y-3">
          {transactions.map((transaction) => {
            const IconComponent = getIcon(transaction.description);
            const isDebit = transaction.type === 'debit' || transaction.amount.startsWith('-');
            
            return (
              <div key={transaction.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isDebit ? 'bg-red-50' : 'bg-green-50'}`}>
                      <IconComponent className={`w-5 h-5 ${isDebit ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isDebit ? 'text-red-600' : 'text-green-600'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      €{transaction.amount}
                    </p>
                  </div>
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