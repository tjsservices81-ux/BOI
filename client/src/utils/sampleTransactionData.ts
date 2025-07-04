// Real banking transaction data for statement generation
// This provides authentic transaction history when none exists

export const generateRealisticTransactions = (accountId: number, accountBalance: string, daysBack: number = 30) => {
  // Exact transactions from user's screenshot - DO NOT GENERATE RANDOM DATA
  const exactTransactions = [
    {
      id: 1001,
      accountId: accountId,
      date: new Date('2025-06-27').toISOString(),
      description: 'CHILD BENEFIT',
      type: 'credit',
      amount: '140.00',
      balance: '1640.31',
      merchant: 'CHILD BENEFIT',
      category: 'Income'
    },
    {
      id: 1002,
      accountId: accountId,
      date: new Date('2025-06-23').toISOString(),
      description: 'LIDL',
      type: 'debit',
      amount: '25.40',
      balance: '1500.31',
      merchant: 'LIDL',
      category: 'Expenses'
    },
    {
      id: 1003,
      accountId: accountId,
      date: new Date('2025-06-22').toISOString(),
      description: 'IKEA',
      type: 'debit',
      amount: '156.40',
      balance: '1525.71',
      merchant: 'IKEA',
      category: 'Expenses'
    },
    {
      id: 1004,
      accountId: accountId,
      date: new Date('2025-06-17').toISOString(),
      description: 'COURSE FEE',
      type: 'debit',
      amount: '250.00',
      balance: '1682.11',
      merchant: 'COURSE FEE',
      category: 'Expenses'
    },
    {
      id: 1005,
      accountId: accountId,
      date: new Date('2025-06-15').toISOString(),
      description: 'PAYPAL TRANSFER',
      type: 'credit',
      amount: '250.00',
      balance: '1932.11',
      merchant: 'PAYPAL TRANSFER',
      category: 'Income'
    },
    {
      id: 1006,
      accountId: accountId,
      date: new Date('2025-06-10').toISOString(),
      description: 'TESCO STORES',
      type: 'debit',
      amount: '45.67',
      balance: '1682.11',
      merchant: 'TESCO STORES',
      category: 'Expenses'
    },
    {
      id: 1007,
      accountId: accountId,
      date: new Date('2025-06-01').toISOString(),
      description: 'MONTHLY SALARY',
      type: 'credit',
      amount: '2500.00',
      balance: '1727.78',
      merchant: 'MONTHLY SALARY',
      category: 'Income'
    }
  ];
  
  // Sort by date ascending (oldest first)
  exactTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate proper running balances
  const finalBalance = parseFloat(accountBalance);
  let currentBalance = finalBalance;
  
  // Work backwards to calculate opening balance
  for (let i = exactTransactions.length - 1; i >= 0; i--) {
    const tx = exactTransactions[i];
    if (tx.type === 'credit') {
      currentBalance -= parseFloat(tx.amount);
    } else {
      currentBalance += parseFloat(tx.amount);
    }
  }
  
  // Now work forwards to set correct balances
  exactTransactions.forEach(tx => {
    if (tx.type === 'credit') {
      currentBalance += parseFloat(tx.amount);
    } else {
      currentBalance -= parseFloat(tx.amount);
    }
    tx.balance = currentBalance.toFixed(2);
  });
  
  return exactTransactions;
};

