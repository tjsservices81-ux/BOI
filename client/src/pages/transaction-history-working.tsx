import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { ArrowLeft, Trash2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UserDataManager } from '@/utils/userDataManager';

export default function TransactionHistoryWorking() {
  const [, params] = useRoute('/transactions/:accountId');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState('0.00');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const accountId = params?.accountId ? parseInt(params.accountId) : 1;

  const handleDeleteTransaction = () => {
    if (!selectedTransaction) return;
    
    try {
      // Get user-specific transactions
      const userTransactions = UserDataManager.getUserTransactions();
      
      // Filter out the selected transaction
      const updatedTransactions = userTransactions.filter((tx: any) => tx.id !== selectedTransaction.id);
      
      // Update user-specific storage
      UserDataManager.setUserTransactions(updatedTransactions);
      
      // Close modal and confirmation first
      setSelectedTransaction(null);
      setShowDeleteConfirm(false);
      
      // Force a complete reload of data
      setTimeout(() => {
        // Add exchange rate data to existing UK transfers that don't have it
        const enhancedTransactions = updatedTransactions.map((tx: any) => {
          if (tx.paymentMethod === 'UK Transfer' && !tx.exchangeRate) {
            const amount = parseFloat(tx.amount.replace('-', ''));
            const sampleRate = 0.8456; // Sample EUR to GBP rate
            return {
              ...tx,
              exchangeRate: sampleRate,
              convertedAmount: (amount * sampleRate).toFixed(2),
              convertedCurrency: 'GBP'
            };
          }
          return tx;
        });
        
        // Update user transactions with enhanced data if needed
        if (JSON.stringify(enhancedTransactions) !== JSON.stringify(updatedTransactions)) {
          UserDataManager.setUserTransactions(enhancedTransactions);
        }
      
        // Update local state with filtered account transactions
        const accountTransactions = enhancedTransactions.filter((tx: any) => tx.accountId === accountId);
        setTransactions(accountTransactions);
      
        // Dispatch events to update other components
        window.dispatchEvent(new CustomEvent('transactionDeleted', {
          detail: { transactionId: selectedTransaction?.id }
        }));
        window.dispatchEvent(new CustomEvent('transactionUpdate'));
      }, 100);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setSelectedTransaction(null);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    const loadData = () => {
      try {
        // Get user-specific transactions
        const userTransactions = UserDataManager.getUserTransactions();
        
        // Add exchange rate data to existing UK transfers that don't have it
        const updatedTransactions = userTransactions.map((tx: any) => {
          if (tx.paymentMethod === 'UK Transfer' && !tx.exchangeRate) {
            const amount = parseFloat(tx.amount.replace('-', ''));
            const sampleRate = 0.8456; // Sample EUR to GBP rate
            return {
              ...tx,
              exchangeRate: sampleRate,
              convertedAmount: (amount * sampleRate).toFixed(2),
              convertedCurrency: 'GBP'
            };
          }
          return tx;
        });
        
        // Update user transactions with enhanced data if needed
        if (JSON.stringify(updatedTransactions) !== JSON.stringify(userTransactions)) {
          UserDataManager.setUserTransactions(updatedTransactions);
        }
        
        const accountTransactions = updatedTransactions.filter((tx: any) => tx.accountId === accountId);
        console.log('Loaded transactions for account', accountId, ':', accountTransactions);
        
        // Update the transactions state with enhanced data
        setTransactions(accountTransactions);
        
        // Get user-specific account info and balance
        const userAccounts = UserDataManager.getUserAccounts();
        const currentAccount = userAccounts.find((acc: any) => acc.id === accountId);
        
        if (currentAccount) {
          setBalance(currentAccount.balance);
          setAccountInfo(currentAccount);
        }
      } catch (error) {
        console.error('Error loading transaction data:', error);
        setTransactions([]);
      }
    };
    
    loadData();
    
    // Listen for transaction updates
    const handleTransactionUpdate = () => {
      loadData();
    };
    
    window.addEventListener('transactionUpdate', handleTransactionUpdate);
    window.addEventListener('transactionDeleted', handleTransactionUpdate);
    
    return () => {
      window.removeEventListener('transactionUpdate', handleTransactionUpdate);
      window.removeEventListener('transactionDeleted', handleTransactionUpdate);
    };
  }, [accountId]);

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount.replace(/[+\-€]/g, ''));
    return `€${numAmount.toFixed(2)}`;
  };

  const getTransactionIcon = (type: string, category?: string) => {
    if (category === 'transfer') return '↗️';
    return type === 'credit' ? '↗️' : '↙️';
  };

  const getAccountDisplayName = () => {
    if (!accountInfo) return 'Account';
    return accountInfo.displayName || `Account ${accountInfo.accountNumber}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {getAccountDisplayName()}
            </h1>
            <p className="text-sm text-gray-600">
              Balance: €{balance}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-4">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTransaction(transaction)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getTransactionIcon(transaction.type, transaction.category)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.timestamp).toLocaleDateString('en-IE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      {transaction.reference && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ref: {transaction.reference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'credit' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </p>
                    {transaction.exchangeRate && transaction.convertedAmount && (
                      <p className="text-xs text-gray-500">
                        ≈ £{transaction.convertedAmount} GBP
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Transaction Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium">{selectedTransaction.description}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className={`font-semibold text-lg ${
                  selectedTransaction.type === 'credit' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(selectedTransaction.amount)}
                </p>
                {selectedTransaction.exchangeRate && selectedTransaction.convertedAmount && (
                  <p className="text-sm text-gray-500">
                    ≈ £{selectedTransaction.convertedAmount} GBP (Rate: {selectedTransaction.exchangeRate})
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {new Date(selectedTransaction.timestamp).toLocaleDateString('en-IE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {selectedTransaction.reference && (
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-mono text-sm">{selectedTransaction.reference}</p>
                </div>
              )}
              
              {selectedTransaction.paymentMethod && (
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium">{selectedTransaction.paymentMethod}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setSelectedTransaction(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-lg font-semibold">Delete Transaction</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteTransaction}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}