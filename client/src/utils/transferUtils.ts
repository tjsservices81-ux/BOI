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
  // Get current balances from localStorage
  const storedAccounts = JSON.parse(localStorage.getItem('bankAccounts') || '[]');
  const defaultAccounts = [
    { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "2322.40", accountType: "current" },
    { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "2000.00", accountType: "credit" },
    { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "7500.00", accountType: "savings" },
    { id: 4, displayName: "Personal Loan", accountNumber: "****8923", balance: "2500.00", accountType: "loan" },
    { id: 5, displayName: "Deposit - 365 Monthly Saver", accountNumber: "****7908", balance: "100.00", accountType: "deposit" }
  ];
  
  const accounts = storedAccounts.length > 0 ? storedAccounts : defaultAccounts;
  
  return accounts.map((acc: any) => ({
    id: acc.id.toString(),
    name: acc.displayName,
    number: acc.accountNumber.replace('****', '-'),
    balance: `€${parseFloat(acc.balance).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }));
};

export const processTransfer = (
  fromAccountId: string,
  amount: number,
  recipientName: string,
  transferType: 'UK' | 'IBAN',
  reference: string
): boolean => {
  console.log('Processing transfer:', { fromAccountId, amount, recipientName, transferType, reference });
  
  // Get stored accounts from localStorage or use defaults
  const storedAccounts = JSON.parse(localStorage.getItem('bankAccounts') || '[]');
  let accounts = storedAccounts.length > 0 ? storedAccounts : [
    { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "2322.40", accountType: "current" },
    { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "2000.00", accountType: "credit" },
    { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "7500.00", accountType: "savings" },
    { id: 4, displayName: "Personal Loan", accountNumber: "****8923", balance: "2500.00", accountType: "loan" },
    { id: 5, displayName: "Deposit - 365 Monthly Saver", accountNumber: "****7908", balance: "100.00", accountType: "deposit" }
  ];
  
  console.log('Found accounts:', accounts);
  
  const selectedAccount = accounts.find((acc: any) => acc.id.toString() === fromAccountId);
  console.log('Selected account:', selectedAccount);
  
  if (!selectedAccount) {
    console.error('Account not found');
    return false;
  }
  
  const currentBalance = parseFloat(selectedAccount.balance);
  console.log('Current balance:', currentBalance, 'Transfer amount:', amount);
  
  if (amount > currentBalance) {
    console.error('Insufficient funds');
    console.error('Transfer failed');
    return false;
  }
  
  // Update balance in the account
  const newBalance = (currentBalance - amount).toFixed(2);
  selectedAccount.balance = newBalance;
  console.log('New balance:', newBalance);
  
  // Update the accounts array
  const updatedAccounts = accounts.map((acc: any) => 
    acc.id.toString() === fromAccountId ? selectedAccount : acc
  );
  
  // Store updated accounts
  localStorage.setItem('bankAccounts', JSON.stringify(updatedAccounts));
  console.log('Updated accounts stored');
  
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
  console.log('Transaction stored:', newTransaction);
  
  // Dispatch balance update event
  window.dispatchEvent(new CustomEvent('balanceUpdate', {
    detail: { accountId: parseInt(fromAccountId), newBalance }
  }));
  
  // Dispatch transaction added event
  window.dispatchEvent(new CustomEvent('transactionAdded', {
    detail: { accountId: parseInt(fromAccountId), transaction: newTransaction }
  }));
  
  console.log('Balance update and transaction events dispatched');
  
  return true;
};

export const generateReference = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
  const uniqueId = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `BOI${timestamp.toString().slice(-8)}${randomPart}${uniqueId}`;
};