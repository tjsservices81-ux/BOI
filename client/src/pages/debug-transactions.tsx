import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

export default function DebugTransactions() {
  const [, navigate] = useLocation();
  const [rawData, setRawData] = useState<string>('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadDebugData = () => {
      console.log('=== DEBUG TRANSACTIONS ===');
      
      // Get data using UserDataManager
      const transactions = UserDataManager.getUserData('bankTransactions', []);
      const raw = JSON.stringify(transactions);
      setRawData(raw);
      console.log('UserDataManager transactions:', transactions);
      
      setParsedData(transactions);
      setError('');
      console.log('Loaded successfully:', transactions);
    };
    
    loadDebugData();
    
    // Refresh every second
    const interval = setInterval(loadDebugData, 1000);
    return () => clearInterval(interval);
  }, []);

  const clearTransactions = () => {
    UserDataManager.setUserData('bankTransactions', []);
    setRawData('[]');
    setParsedData([]);
    setError('Cleared');
  };

  const addTestTransaction = () => {
    const testTx = {
      id: Date.now(),
      accountId: 1,
      amount: '-99.99',
      description: 'MANUAL TEST TRANSACTION',
      category: 'transfer',
      type: 'debit',
      paymentMethod: 'Test',
      reference: 'TEST123',
      timestamp: new Date().toISOString()
    };
    
    const existing = UserDataManager.getUserData('bankTransactions', []);
    existing.push(testTx);
    UserDataManager.setUserData('bankTransactions', existing);
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
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm">Debug Transactions</span>
        </button>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        padding: '1rem'
      }}>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">Raw localStorage Data:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto" style={{ maxHeight: '200px' }}>
              {rawData}
            </pre>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">Parsed Data ({parsedData.length} transactions):</h3>
            {error && <p className="text-red-600 mb-2">{error}</p>}
            {parsedData.map((tx, index) => (
              <div key={index} className="border-b py-2 last:border-b-0">
                <p><strong>ID:</strong> {tx.id}</p>
                <p><strong>Account:</strong> {tx.accountId}</p>
                <p><strong>Amount:</strong> {tx.amount}</p>
                <p><strong>Description:</strong> {tx.description}</p>
                <p><strong>Reference:</strong> {tx.reference}</p>
                <p><strong>Timestamp:</strong> {tx.timestamp}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button 
              onClick={addTestTransaction}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
            >
              Add Test Transaction
            </button>
            <button 
              onClick={clearTransactions}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold"
            >
              Clear All Transactions
            </button>
            <button 
              onClick={() => navigate('/transactions/1')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
            >
              Go to Transaction History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}