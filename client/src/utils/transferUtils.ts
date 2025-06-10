// Simple localStorage-based transfer utilities
export interface Account {
  id: string;
  name: string;
  number: string;
  balance: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  amount: string;
  description: string;
  category: string;
  type: 'debit' | 'credit';
  paymentMethod: string;
  reference: string;
  timestamp: string;
}

export const getAccounts = (): Account[] => {
  return [
    { id: '1', name: 'Current Account', number: '-2091', balance: '€2,322.40' },
    { id: '2', name: 'Credit Card', number: '-1820', balance: '€2,000.00' },
    { id: '3', name: 'Savings Account', number: '-0978', balance: '€7,500.00' },
    { id: '4', name: 'Personal Loan', number: '-8923', balance: '€2,500.00' },
    { id: '5', name: 'Deposit - 365 Monthly Saver', number: '-7908', balance: '€100.00' }
  ];
};

export const processTransfer = (
  fromAccountId: string,
  amount: number,
  recipientName: string,
  transferType: 'UK' | 'IBAN',
  reference: string
): boolean => {
  const accounts = getAccounts();
  const selectedAccount = accounts.find(acc => acc.id === fromAccountId);
  
  if (!selectedAccount) return false;
  
  const currentBalance = parseFloat(selectedAccount.balance.replace('€', '').replace(',', ''));
  
  if (amount > currentBalance) return false;
  
  // Store transaction
  const transactions = JSON.parse(localStorage.getItem('bankTransactions') || '[]');
  const newTransaction: Transaction = {
    id: Date.now(),
    accountId: parseInt(fromAccountId),
    amount: `-${amount.toFixed(2)}`,
    description: `${transferType} Transfer to ${recipientName}`,
    category: 'transfer',
    type: 'debit',
    paymentMethod: `${transferType} Transfer`,
    reference,
    timestamp: new Date().toISOString()
  };
  
  transactions.push(newTransaction);
  localStorage.setItem('bankTransactions', JSON.stringify(transactions));
  
  // Update balance
  const newBalance = (currentBalance - amount).toFixed(2);
  window.dispatchEvent(new CustomEvent('balanceUpdate', {
    detail: { accountId: parseInt(fromAccountId), newBalance }
  }));
  
  return true;
};

export const generateReference = (): string => {
  return `BOI${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};