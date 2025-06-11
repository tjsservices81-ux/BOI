// Simple localStorage-based transfer utilities
import { UserDataManager } from "./userDataManager";

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
  exchangeRate?: number;
  convertedAmount?: string;
  convertedCurrency?: string;
}

export const getAccounts = (): Account[] => {
  try {
    const userAccounts = UserDataManager.getUserAccounts();
    return userAccounts.map((acc: any) => ({
      id: acc.id.toString(),
      name: acc.displayName,
      number: acc.accountNumber.replace('****', '-'),
      balance: `€${parseFloat(acc.balance).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
};

export const processTransfer = (
  fromAccountId: string,
  amount: number,
  recipientName: string,
  transferType: 'UK' | 'IBAN',
  reference: string,
  exchangeRate?: number
): boolean => {
  console.log('Processing transfer:', { fromAccountId, amount, recipientName, transferType, reference });
  
  try {
    // Get user-specific accounts
    const userAccounts = UserDataManager.getUserAccounts();
    console.log('Found accounts:', userAccounts);
    
    const selectedAccount = userAccounts.find((acc: any) => acc.displayName === fromAccountId);
    console.log('Selected account:', selectedAccount);
    
    if (!selectedAccount) {
      console.error('Account not found');
      return false;
    }
    
    const currentBalance = parseFloat(selectedAccount.balance.replace(/,/g, ''));
    console.log('Current balance:', currentBalance, 'Transfer amount:', amount);
    
    if (amount > currentBalance) {
      console.error('Insufficient funds');
      return false;
    }
    
    // Update balance in the account
    const newBalance = (currentBalance - amount).toFixed(2);
    selectedAccount.balance = newBalance;
    console.log('New balance:', newBalance);
    
    // Update the accounts array
    const updatedAccounts = userAccounts.map((acc: any) => 
      acc.displayName === fromAccountId ? selectedAccount : acc
    );
    
    // Save updated accounts to user-specific storage
    UserDataManager.setUserAccounts(updatedAccounts);
    console.log('Updated accounts stored');
    
    // Store transaction in user-specific storage
    const userTransactions = UserDataManager.getUserTransactions();
    const newTransaction: Transaction = {
      id: Date.now(),
      accountId: selectedAccount.id,
      amount: `-${amount.toFixed(2)}`,
      description: `${transferType} Transfer to ${recipientName}`,
      category: 'transfer',
      type: 'debit',
      paymentMethod: `${transferType} Transfer`,
      reference,
      timestamp: new Date().toISOString(),
      ...(transferType === 'UK' && exchangeRate && {
        exchangeRate,
        convertedAmount: (amount * exchangeRate).toFixed(2),
        convertedCurrency: 'GBP'
      })
    };
    
    userTransactions.push(newTransaction);
    UserDataManager.setUserTransactions(userTransactions);
    console.log('Transaction stored:', newTransaction);
    
    return true;
  } catch (error) {
    console.error('Transfer processing error:', error);
    return false;
  }
};

export const generateReference = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
  const uniqueId = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `BOI${timestamp.toString().slice(-8)}${randomPart}${uniqueId}`;
};