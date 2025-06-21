// Simple localStorage-based transfer utilities
import { UserDataManager } from './userDataManager';

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
  reference?: string;
  userPaymentReference?: string;
  recipientName?: string;
  iban?: string;
  bicCode?: string;
  recipientAccountNumber?: string;
  recipientSortCode?: string;
  recipientIban?: string;
  exchangeRate?: number;
  convertedAmount?: string;
  convertedCurrency?: string;
  timestamp: string;
}

export const getAccounts = (): Account[] => {
  // Clear cache to ensure we get the most recent data
  UserDataManager.clearCache('bankAccounts');
  
  // Get current balances using UserDataManager
  const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
  const defaultAccounts = [
    { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "0.00", accountType: "current" },
    { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "0.00", accountType: "credit" },
    { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "0.00", accountType: "savings" }
  ];
  
  // Ensure we have valid account data
  const accounts = (Array.isArray(storedAccounts) && storedAccounts.length > 0) ? storedAccounts : defaultAccounts;
  
  return accounts.map((acc: any) => ({
    id: acc.id.toString(),
    name: acc.displayName,
    number: acc.accountNumber.replace('****', '-'),
    balance: `€${parseFloat(acc.balance || '0.00').toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }));
};

export const processSecureTransfer = async (
  fromAccountId: string,
  amount: number,
  recipientName: string,
  transferType: 'UK' | 'IBAN',
  reference: string,
  exchangeRate?: number,
  recipientDetails?: { accountNumber?: string; sortCode?: string; iban?: string }
): Promise<{ success: boolean; transferId?: string; error?: string; requiresConfirmation?: boolean }> => {
  console.log('Initiating secure transfer:', { fromAccountId, amount, recipientName, transferType, reference });

  // Get user phone number for security call
  const userProfile = UserDataManager.getUserProfile();
  if (!userProfile?.phone) {
    return { success: false, error: 'Phone number required for security verification' };
  }

  // Generate unique transfer ID
  const transferId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  try {
    // Initiate security call
    const securityResponse = await fetch('/api/security/initiate-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount.toFixed(2),
        recipientName,
        userPhoneNumber: userProfile.phone,
        transferId,
        transferType
      })
    });

    const securityResult = await securityResponse.json();
    
    if (!securityResult.success) {
      return { success: false, error: securityResult.error || 'Security verification failed' };
    }

    console.log(`Security call initiated for transfer ${transferId}`);
    
    // Return pending status - actual transfer will be processed after voice confirmation
    return { 
      success: true, 
      transferId, 
      requiresConfirmation: true 
    };

  } catch (error) {
    console.error('Failed to initiate secure transfer:', error);
    return { success: false, error: 'Failed to initiate security verification' };
  }
};

export const processTransfer = (
  fromAccountId: string,
  amount: number,
  recipientName: string,
  transferType: 'UK' | 'IBAN',
  reference: string,
  exchangeRate?: number,
  recipientDetails?: { accountNumber?: string; sortCode?: string; iban?: string; bicCode?: string },
  userPaymentReference?: string
): boolean => {
  console.log('Processing transfer:', { fromAccountId, amount, recipientName, transferType, reference });
  
  // Get stored accounts using UserDataManager
  const accounts = UserDataManager.getUserData('bankAccounts', []);
  
  console.log('Found accounts:', accounts);
  
  // Ensure accounts is an array and not null
  if (!Array.isArray(accounts) || accounts.length === 0) {
    console.error('No accounts available for transfer');
    return false;
  }
  
  const selectedAccount = accounts.find((acc: any) => acc && acc.id && acc.id.toString() === fromAccountId);
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
  
  // Store updated accounts using UserDataManager
  UserDataManager.setUserData('bankAccounts', updatedAccounts);
  console.log('Updated accounts stored');
  
  // Store transaction using UserDataManager
  const transactions = UserDataManager.getUserData('bankTransactions', []);
  const newTransaction: Transaction = {
    id: Date.now(),
    accountId: parseInt(fromAccountId),
    amount: `-${amount.toFixed(2)}`,
    description: `${transferType === 'IBAN' ? 'SEPA' : transferType} Transfer to ${recipientName}`,
    category: 'transfer',
    type: 'debit',
    paymentMethod: `${transferType === 'IBAN' ? 'SEPA' : transferType} Transfer`,
    reference, // System-generated reference for tracking
    userPaymentReference: userPaymentReference || '', // User's typed payment reference
    recipientName,
    timestamp: new Date().toISOString(),
    ...(transferType === 'UK' && exchangeRate && {
      exchangeRate,
      convertedAmount: (amount * exchangeRate).toFixed(2),
      convertedCurrency: 'GBP'
    }),
    ...(recipientDetails && {
      recipientAccountNumber: recipientDetails.accountNumber,
      recipientSortCode: recipientDetails.sortCode,
      iban: recipientDetails.iban,
      bicCode: recipientDetails.bicCode,
      recipientIban: recipientDetails.iban
    })
  };
  
  transactions.push(newTransaction);
  UserDataManager.setUserData('bankTransactions', transactions);
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

export const checkTransferConfirmation = async (transferId: string): Promise<{ confirmed: boolean; status: any }> => {
  try {
    const response = await fetch(`/api/security/status/${transferId}`);
    const result = await response.json();
    return { confirmed: result.confirmed, status: result.status };
  } catch (error) {
    console.error('Failed to check transfer confirmation:', error);
    return { confirmed: false, status: null };
  }
};

export const processConfirmedTransfer = (
  transferId: string,
  fromAccountId: string,
  amount: number,
  recipientName: string,
  transferType: 'UK' | 'IBAN',
  reference: string,
  exchangeRate?: number,
  recipientDetails?: { accountNumber?: string; sortCode?: string; iban?: string; bicCode?: string },
  userPaymentReference?: string
): boolean => {
  console.log('Processing confirmed transfer:', { transferId, fromAccountId, amount, recipientName, transferType, reference, userPaymentReference });
  
  // Execute the actual transfer logic that was previously in processTransfer
  const success = processTransfer(fromAccountId, amount, recipientName, transferType, reference, exchangeRate, recipientDetails, userPaymentReference);
  
  if (success) {
    console.log(`Transfer ${transferId} completed successfully`);
  } else {
    console.error(`Transfer ${transferId} failed during processing`);
  }
  
  return success;
};

export const generateReference = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
  const uniqueId = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `BOI${timestamp.toString().slice(-8)}${randomPart}${uniqueId}`;
};