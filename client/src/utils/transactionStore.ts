// Transaction and Account Management System
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance: number;
  reference?: string;
  category: string;
  fromAccount?: string;
  toAccount?: string;
  sortCode?: string;
  accountNumber?: string;
  recipientName?: string;
}

export interface Account {
  id: string;
  name: string;
  number: string;
  balance: number;
  displayBalance: string;
}

// Initial account data
const initialAccounts: Account[] = [
  { id: 'current-2091', name: 'Current Account', number: '-2091', balance: 2322.40, displayBalance: '€2,322.40' },
  { id: 'credit-1820', name: 'Credit Card', number: '-1820', balance: 2000.00, displayBalance: '€2,000.00' },
  { id: 'savings-0978', name: 'Savings Account', number: '-0978', balance: 7500.00, displayBalance: '€7,500.00' },
  { id: 'loan-8923', name: 'Personal Loan', number: '-8923', balance: 2500.00, displayBalance: '€2,500.00' },
  { id: 'deposit-7908', name: 'Deposit - 365 Monthly Saver', number: '-7908', balance: 100.00, displayBalance: '€100.00' }
];

// Initial transaction data (original sample transactions)
const initialTransactions: Transaction[] = [
  {
    id: 'txn001',
    date: '2024-06-10',
    description: 'Monthly Salary',
    amount: 3200.00,
    type: 'credit',
    balance: 2322.40,
    category: 'salary',
    reference: 'SAL240610'
  },
  {
    id: 'txn002',
    date: '2024-06-09',
    description: 'SuperValu Churchtown',
    amount: -89.50,
    type: 'debit',
    balance: 2232.90,
    category: 'shopping',
    reference: 'POS240609'
  },
  {
    id: 'txn003',
    date: '2024-06-08',
    description: 'Circle K Dublin',
    amount: -65.20,
    type: 'debit',
    balance: 2567.40,
    category: 'fuel',
    reference: 'POS240608'
  },
  {
    id: 'txn004',
    date: '2024-06-07',
    description: 'Electric Ireland',
    amount: -125.00,
    type: 'debit',
    balance: 2632.60,
    category: 'utilities',
    reference: 'DD240607'
  },
  {
    id: 'txn005',
    date: '2024-06-06',
    description: 'Restaurant Dublin',
    amount: -45.80,
    type: 'debit',
    balance: 2757.60,
    category: 'dining',
    reference: 'POS240606'
  },
  {
    id: 'txn006',
    date: '2024-06-05',
    description: 'Dunnes Stores',
    amount: -156.40,
    type: 'debit',
    balance: 2803.40,
    category: 'shopping',
    reference: 'POS240605'
  },
  {
    id: 'txn007',
    date: '2024-06-04',
    description: 'ATM Withdrawal',
    amount: -200.00,
    type: 'debit',
    balance: 2959.80,
    category: 'cash',
    reference: 'ATM240604'
  },
  {
    id: 'txn008',
    date: '2024-06-03',
    description: 'Online Transfer',
    amount: -150.00,
    type: 'debit',
    balance: 3159.80,
    category: 'transfer',
    reference: 'WEB240603'
  }
];

// Storage keys
const ACCOUNTS_KEY = 'boi_accounts';
const TRANSACTIONS_KEY = 'boi_transactions';

// Get accounts from localStorage or initialize with defaults
export function getAccounts(): Account[] {
  const stored = localStorage.getItem(ACCOUNTS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(initialAccounts));
  return initialAccounts;
}

// Get transactions from localStorage or initialize with defaults
export function getTransactions(): Transaction[] {
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(initialTransactions));
  return initialTransactions;
}

// Update account balance
export function updateAccountBalance(accountId: string, newBalance: number): void {
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex(acc => acc.id === accountId);
  
  if (accountIndex !== -1) {
    accounts[accountIndex].balance = newBalance;
    accounts[accountIndex].displayBalance = `€${newBalance.toLocaleString('en-IE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
}

// Add a new transaction
export function addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
  const transactions = getTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  };
  
  transactions.unshift(newTransaction); // Add to beginning for chronological order
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  
  return newTransaction;
}

// Process a transfer transaction
export function processTransfer(
  fromAccountId: string,
  amount: number,
  description: string,
  reference: string,
  recipientName?: string,
  sortCode?: string,
  accountNumber?: string
): { success: boolean; newBalance?: number; transaction?: Transaction } {
  const accounts = getAccounts();
  const fromAccount = accounts.find(acc => acc.id === fromAccountId);
  
  if (!fromAccount) {
    return { success: false };
  }
  
  // Check if sufficient funds (for non-credit accounts)
  if (!fromAccountId.includes('credit') && fromAccount.balance < amount) {
    return { success: false };
  }
  
  // Calculate new balance
  const newBalance = fromAccount.balance - amount;
  
  // Update account balance
  updateAccountBalance(fromAccountId, newBalance);
  
  // Create transaction record
  const transaction = addTransaction({
    date: new Date().toISOString().split('T')[0],
    description,
    amount: -amount,
    type: 'debit',
    balance: newBalance,
    category: 'Transfer',
    reference,
    fromAccount: fromAccountId,
    recipientName,
    sortCode,
    accountNumber
  });
  
  return { success: true, newBalance, transaction };
}

// Get account by ID
export function getAccountById(accountId: string): Account | undefined {
  const accounts = getAccounts();
  return accounts.find(acc => acc.id === accountId);
}

// Get transactions for a specific account
export function getTransactionsForAccount(accountId: string): Transaction[] {
  const transactions = getTransactions();
  return transactions.filter(txn => 
    txn.fromAccount === accountId || 
    txn.toAccount === accountId
  );
}