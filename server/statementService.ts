import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

interface StatementRequest {
  accountId: string;
  startDate: string;
  endDate: string;
  dateRange: string;
  customerName?: string;
  userAddress?: string;
  userCurrency?: 'EUR' | 'GBP';
  userTransactions?: Array<{
    id: string | number;
    accountId: number;
    amount: string;
    description: string;
    category: string;
    type: 'credit' | 'debit';
    reference?: string;
    timestamp: string;
    recipientName?: string;
    paymentMethod?: string;
    recipientAccountNumber?: string;
    recipientSortCode?: string;
    iban?: string;
    bicCode?: string;
  }>;
  userAccounts?: Array<{
    id: number;
    displayName: string;
    accountNumber: string;
    balance: string;
    accountType: string;
    sortCode?: string;
  }>;
}

interface StatementTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance: number;
  reference?: string;
  category?: string;
}



interface Account {
  id: string;
  displayName: string;
  accountNumber: string;
  sortCode: string;
  balance: string;
  accountType: string;
}

export class StatementService {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(process.cwd(), 'attached_assets', 'IMG_1972_1751725687784.png');
  }

  private getCurrencySymbol(currency?: 'EUR' | 'GBP'): string {
    return currency === 'GBP' ? '£' : '€';
  }

  async generateStatement(request: StatementRequest): Promise<Buffer> {
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Bank of Ireland - Account Statement',
        Author: 'Bank of Ireland',
        Subject: 'Account Statement',
        Creator: 'Bank of Ireland Digital Banking'
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', reject);

      try {
        await this.buildStatement(doc, request);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async buildStatement(doc: PDFKit.PDFDocument, request: StatementRequest) {
    try {
      console.log('🔷 Starting statement generation with request:', {
        accountId: request.accountId,
        startDate: request.startDate,
        endDate: request.endDate,
        hasCustomerName: !!request.customerName,
        hasUserAddress: !!request.userAddress,
        numAccounts: request.userAccounts?.length || 0,
        numTransactions: request.userTransactions?.length || 0
      });
      
      // Get account and transaction data using real user data
      const accountData = await this.getAccountData(request.accountId, request.userAccounts);
      const transactions = await this.getTransactions(request);
      
      console.log('✅ Account data retrieved:', {
        accountName: accountData.displayName,
        balance: accountData.balance
      });
      console.log('✅ Transactions retrieved:', transactions.length);
      
      // Validate data
      if (!accountData) {
        throw new Error('Account data not found');
      }
      
      // Add Bank of Ireland template as background
      if (fs.existsSync(this.templatePath)) {
        doc.image(this.templatePath, 0, 0, { 
          width: 595, 
          height: 842
        });
      } else {
        console.warn('⚠️ Bank of Ireland template image not found at:', this.templatePath);
      }

      // Add all content sections synchronously to avoid race conditions
      console.log('📄 Adding statement sections...');
      this.addHeader(doc);
      this.addAccountInfo(doc, accountData, request);
      this.addStatementPeriod(doc, request);
      this.addAccountSummary(doc, accountData, transactions, request.userCurrency);
      this.addTransactionDetails(doc, transactions, request.userCurrency);
      this.addFooter(doc);
      
      console.log('✅ Statement built successfully');
      
    } catch (error) {
      console.error('❌ Error building statement:', error);
      console.error('Request data at time of failure:', JSON.stringify(request, null, 2));
      throw error;
    }
  }

  private addHeader(doc: PDFKit.PDFDocument) {
    // Bank of Ireland Blue Color
    const boiBlue = '#0000FF';
    
    // Account Statement text - positioned just below BOI logo
    doc.fontSize(18)
       .fillColor(boiBlue)
       .font('Helvetica')
       .text('Account Statement', 400, 180);
    
    // Bank address - positioned below statement header
    doc.fontSize(10)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Head Office: 40 Mespil Road, Dublin 4, Ireland', 50, 210)
       .text('Phone: +353 1 611 1111 | www.bankofireland.com', 50, 225);
    
    // Horizontal line - positioned below bank address
    doc.moveTo(50, 245)
       .lineTo(545, 245)
       .strokeColor(boiBlue)
       .lineWidth(2)
       .stroke();
  }

  private addAccountInfo(doc: PDFKit.PDFDocument, account: Account, request: StatementRequest) {
    const startY = 265; // Positioned higher for more transaction space
    
    doc.fontSize(14)
       .fillColor('#0000FF')
       .font('Helvetica-Bold')
       .text('Account Information', 50, startY);
    
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica');
    
    // Add customer name if available (using authentic user data)
    if (request.customerName) {
      let currentY = startY + 25;
      doc.text(request.customerName, 50, currentY);
      currentY += 20;
      
      // Add customer address if available
      if (request.userAddress) {
        doc.text(request.userAddress, 50, currentY);
        currentY += 20;
      }
      
      doc.text(account.displayName, 50, currentY)
         .text(`Account Number: ${account.accountNumber}`, 50, currentY + 20)
         .text(`Sort Code: ${account.sortCode}`, 50, currentY + 40);
      
      // Removed Statement Date and Statement Period from top-right
      // Removed Account Type line
    } else {
      doc.text(account.displayName, 50, startY + 25)
         .text(`Account Number: ${account.accountNumber}`, 50, startY + 45)
         .text(`Sort Code: ${account.sortCode}`, 50, startY + 65);
      
      // Removed Statement Date and Statement Period from top-right
      // Removed Account Type line
    }
  }

  private addStatementPeriod(doc: PDFKit.PDFDocument, request: StatementRequest) {
    const startY = 390; // Positioned lower to accommodate customer name in Account Information
    
    // Use actual dates from request with safe formatting
    let startDateStr = 'N/A';
    let endDateStr = 'N/A';
    
    try {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      
      if (!isNaN(startDate.getTime())) {
        startDateStr = startDate.toLocaleDateString('en-IE');
      }
      
      if (!isNaN(endDate.getTime())) {
        endDateStr = endDate.toLocaleDateString('en-IE');
      }
    } catch (err) {
      console.error('Error formatting statement period dates:', err);
    }
    
    doc.fontSize(14)
       .fillColor('#0000FF')
       .font('Helvetica-Bold')
       .text('Statement Period', 50, startY);
    
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica')
       .text(`From: ${startDateStr} to ${endDateStr}`, 50, startY + 25);
  }

  private addAccountSummary(doc: PDFKit.PDFDocument, account: Account, transactions: StatementTransaction[], currency?: 'EUR' | 'GBP') {
    const startY = 440; // Positioned lower to accommodate customer name and statement period adjustments
    const currencySymbol = this.getCurrencySymbol(currency);
    
    // Calculate totals from real transaction data
    const totalCredits = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDebits = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Use real account balance data and handle app reset scenarios
    const closingBalance = parseFloat(account.balance.replace(/,/g, ''));
    
    // If no transactions (app reset or new account), opening and closing balance are the same
    const openingBalance = transactions.length > 0 ? 
      closingBalance + totalDebits - totalCredits : 
      closingBalance;
    
    doc.fontSize(14)
       .fillColor('#0000FF')
       .font('Helvetica-Bold')
       .text('Account Summary', 50, startY);
    
    // Summary box matching your statement layout
    doc.rect(50, startY + 25, 495, 100)
       .strokeColor('#cccccc')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica')
       .text('Opening Balance:', 70, startY + 45)
       .text('Total Credits:', 70, startY + 65)
       .text('Total Debits:', 70, startY + 85)
       .text('Closing Balance:', 70, startY + 105);
    
    // Right-align amounts with explicit currency symbol positioning
    doc.font('Helvetica-Bold');
    
    // Opening Balance with spaced currency symbol
    doc.text(currencySymbol, 450, startY + 45).text(openingBalance.toFixed(2), 460, startY + 45);
    
    // Total Credits with spaced currency symbol  
    doc.text(currencySymbol, 450, startY + 65).text(totalCredits.toFixed(2), 460, startY + 65);
    
    // Total Debits with spaced currency symbol
    doc.text(currencySymbol, 450, startY + 85).text(totalDebits.toFixed(2), 460, startY + 85);
    
    // Closing Balance with spaced currency symbol
    doc.text(currencySymbol, 450, startY + 105).text(closingBalance.toFixed(2), 460, startY + 105);
  }

  private addTransactionDetails(doc: PDFKit.PDFDocument, transactions: StatementTransaction[], currency?: 'EUR' | 'GBP') {
    let currentY = 570; // Positioned lower to accommodate customer name and adjusted sections above
    const currencySymbol = this.getCurrencySymbol(currency);
    
    doc.fontSize(14)
       .fillColor('#0000FF')
       .font('Helvetica-Bold')
       .text('Transaction Details', 50, currentY);
    
    currentY += 30;
    
    // Table headers matching your statement format
    doc.fontSize(10)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text('Date', 50, currentY)
       .text('Description', 120, currentY)
       .text('Reference', 300, currentY)
       .text('Amount', 400, currentY)
       .text('Balance', 480, currentY);
    
    // Header line
    currentY += 15;
    doc.moveTo(50, currentY)
       .lineTo(545, currentY)
       .strokeColor('#cccccc')
       .lineWidth(1)
       .stroke();
    
    currentY += 10;
    
    // Handle empty transaction list (app reset or new account)
    if (transactions.length === 0) {
      currentY += 20;
      doc.fontSize(11)
         .fillColor('#666666')
         .font('Helvetica')
         .text('No transactions found for the selected period.', 50, currentY);
      
      currentY += 15;
      doc.fontSize(10)
         .fillColor('#888888')
         .font('Helvetica')
         .text('This may indicate:', 50, currentY);
      
      currentY += 12;
      doc.text('• Account was recently opened', 70, currentY);
      currentY += 12;
      doc.text('• No banking activity during this period', 70, currentY);
      currentY += 12;
      doc.text('• Application data was reset to defaults', 70, currentY);
      
      return;
    }
    
    // Transaction rows
    doc.font('Helvetica').fontSize(9);
    
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const isLastTransaction = i === transactions.length - 1;
      
      // Check if we need a new page BEFORE rendering this complete transaction row
      // A4 page is 842 points tall, need 20 points for transaction row + margin
      if (currentY + 20 > 770) {
        doc.addPage();
        currentY = 50;
        
        // Add header on new page
        doc.fontSize(14)
           .fillColor('#0000FF')
           .font('Helvetica-Bold')
           .text('Transaction Details (continued)', 50, currentY);
        
        currentY += 40;
        
        // Repeat table headers
        doc.fontSize(10)
           .fillColor('#333333')
           .font('Helvetica-Bold')
           .text('Date', 50, currentY)
           .text('Description', 120, currentY)
           .text('Reference', 300, currentY)
           .text('Amount', 400, currentY)
           .text('Balance', 480, currentY);
        
        currentY += 15;
        doc.moveTo(50, currentY)
           .lineTo(545, currentY)
           .strokeColor('#cccccc')
           .lineWidth(1)
           .stroke();
        
        currentY += 10;
        doc.font('Helvetica').fontSize(9);
      }
      
      // Format and render the complete transaction row - DD/MM/YYYY format
      const transactionDate = new Date(transaction.date);
      const day = String(transactionDate.getDate()).padStart(2, '0');
      const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
      const year = transactionDate.getFullYear();
      const date = `${day}/${month}/${year}`;
      
      // Render all fields of this transaction on the same line
      doc.fillColor('#333333')
         .font('Helvetica')
         .fontSize(9)
         .text(date, 50, currentY)
         .text(transaction.description.substring(0, 30), 120, currentY);
      
      // Use smaller font size for BOI references to prevent overlap with Amount column
      const reference = transaction.reference || '-';
      if (reference.startsWith('BOI')) {
        doc.fontSize(8).text(reference, 300, currentY);
      } else {
        doc.fontSize(9).text(reference, 300, currentY);
      }
      
      // Render amount with proper currency symbol spacing
      doc.fontSize(9);
      if (transaction.type === 'credit') {
        doc.text(`+${currencySymbol}`, 400, currentY).text(transaction.amount.toFixed(2), 413, currentY);
      } else {
        doc.text(`-${currencySymbol}`, 400, currentY).text(transaction.amount.toFixed(2), 413, currentY);
      }
      
      // Render currency symbol and balance with explicit spacing
      doc.text(currencySymbol, 480, currentY)
         .text(transaction.balance.toFixed(2), 490, currentY);
      
      currentY += 15;
      
      // Add horizontal divider line between transaction rows (but not after the last one)
      if (!isLastTransaction) {
        doc.strokeColor('#cccccc')
           .lineWidth(0.5)
           .moveTo(50, currentY)
           .lineTo(545, currentY)
           .stroke();
        
        currentY += 5;
      }
    }
    
    if (transactions.length === 0) {
      doc.fillColor('#666666')
         .text('No transactions found for this period.', 50, currentY);
    } else {
      console.log(`Successfully rendered ${transactions.length} transactions in PDF`);
    }
  }

  private addFooter(doc: PDFKit.PDFDocument) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 100;
    console.log(`Adding footer at page height: ${pageHeight}, footerY: ${footerY}`);
    
    // Footer line
    doc.moveTo(50, footerY)
       .lineTo(545, footerY)
       .strokeColor('#0000FF')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(8)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Bank of Ireland plc is regulated by the Central Bank of Ireland.', 50, footerY + 15)
       .text('This statement is computer generated and does not require a signature.', 50, footerY + 30)
       .text('For queries regarding this statement, please contact us at +353 1 611 1111', 50, footerY + 45)
       .text(`Generated on: ${new Date().toLocaleString('en-IE')}`, 50, footerY + 60);
  }

  private async getAccountData(accountId: string, userAccounts?: any[]): Promise<Account> {
    // Handle app reset scenarios - check for account data
    if (!userAccounts || userAccounts.length === 0) {
      throw new Error('No account data available. App may have been reset to defaults or user has no accounts configured.');
    }
    
    // Use real account data passed from frontend - with safe ID comparison
    const selectedAccount = userAccounts.find(acc => {
      const accId = acc?.id;
      if (accId === null || accId === undefined) return false;
      return String(accId) === String(accountId);
    });
    
    if (!selectedAccount) {
      const availableIds = userAccounts.map(acc => acc?.id ?? 'unknown').join(', ');
      throw new Error(`Account ${accountId} not found. Available accounts: ${availableIds}. App may need to be restored from backup.`);
    }
    
    // Return real account data with safe defaults
    return {
      id: accountId,
      displayName: selectedAccount.displayName || 'Personal Account',
      accountNumber: selectedAccount.accountNumber || 'Not Available',
      sortCode: "90-78-68", // Always use this sort code for statements
      balance: selectedAccount.balance || '0.00',
      accountType: selectedAccount.accountType || 'Current Account'
    };
  }

  private async getTransactions(request: StatementRequest): Promise<StatementTransaction[]> {
    // Use real transaction data from frontend if provided, otherwise use mock data
    try {
      // Parse dates and add one day to end date to include all of that day
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      
      // Add one day to end date to include all transactions on the end date
      endDate.setDate(endDate.getDate() + 1);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date range provided:', request.startDate, request.endDate);
        return [];
      }
      
      if (startDate > endDate) {
        console.error('Start date is after end date');
        return [];
      }

      // Handle app reset and new account scenarios properly
      if (!request.userTransactions || request.userTransactions.length === 0) {
        console.log('No transaction history found - app may have been reset to defaults or account has no activity');
        return [];
      }
      
      const userTransactions = request.userTransactions;
      
      // Filter transactions for the specified account and date range - with safe null checks
      const filteredTransactions = userTransactions
        .filter((tx) => {
          if (!tx || !tx.timestamp || !tx.accountId) return false;
          
          try {
            const transactionDate = new Date(tx.timestamp);
            if (isNaN(transactionDate.getTime())) return false;
            
            const matchesAccount = String(tx.accountId) === String(request.accountId);
            // Use < instead of <= since we added a day to endDate
            const inDateRange = transactionDate >= startDate && transactionDate < endDate;
            return matchesAccount && inDateRange;
          } catch (err) {
            console.error('Error filtering transaction:', err);
            return false;
          }
        });

      // Convert to statement format with safe parsing
      const mappedTransactions = filteredTransactions
        .map((tx: any) => {
          try {
            const amountStr = String(tx.amount || '0').replace('-', '').replace(/,/g, '');
            const amount = Math.abs(parseFloat(amountStr)) || 0;
            
            return {
              id: String(tx.id || 'unknown'),
              date: tx.timestamp,
              description: tx.description || 'Transaction',
              amount: amount,
              type: (tx.type as 'credit' | 'debit') || 'debit',
              balance: 0, // Will be calculated below
              reference: tx.reference || `TXN${tx.id || ''}`,
              category: tx.category || 'Other'
            } as StatementTransaction;
          } catch (err) {
            console.error('Error mapping transaction:', err, tx);
            return null;
          }
        })
        .filter((tx: StatementTransaction | null): tx is StatementTransaction => tx !== null);
      
      const statementTransactions = mappedTransactions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balances using real account data
      const currentAccountBalance = this.getRealAccountBalance(request.accountId, request.userAccounts, request.userCurrency);
      let runningBalance = this.calculateOpeningBalance(currentAccountBalance, statementTransactions, request.userCurrency);
      
      const transactionsWithBalance = statementTransactions.map(tx => {
        if (tx.type === 'debit') {
          runningBalance -= tx.amount;
        } else {
          runningBalance += tx.amount;
        }
        return { ...tx, balance: runningBalance };
      });

      // Return in reverse chronological order (newest first)
      const finalTransactions = transactionsWithBalance.reverse();
      
      console.log(`Returning ${finalTransactions.length} real user transactions for statement with authentic balances`);
      return finalTransactions;
      
    } catch (error) {
      console.error('Error processing transactions:', error);
      return [];
    }
  }

  private getRealAccountBalance(accountId: string, userAccounts?: any[], currency: 'EUR' | 'GBP' = 'EUR'): number {
    if (!userAccounts || userAccounts.length === 0) {
      console.warn('No user account data available, using default balance of 0');
      return 0;
    }
    
    const selectedAccount = userAccounts.find(acc => {
      const accId = acc?.id;
      if (accId === null || accId === undefined) return false;
      return String(accId) === String(accountId);
    });
    
    if (!selectedAccount) {
      console.warn(`Account ${accountId} not found in user accounts, using default balance of 0`);
      return 0;
    }
    
    // Parse actual account balance safely, removing commas and converting to number
    try {
      const balanceStr = String(selectedAccount.balance || '0').replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      if (isNaN(balance)) {
        console.warn(`Invalid balance format for account ${accountId}, using default balance of 0`);
        return 0;
      }
      const currencySymbol = this.getCurrencySymbol(currency);
      console.log(`Real account ${accountId} balance: ${currencySymbol}${balance.toFixed(2)}`);
      return balance;
    } catch (err) {
      console.error('Error parsing account balance:', err);
      return 0;
    }
  }

  private calculateOpeningBalance(currentBalance: number, transactions: StatementTransaction[], currency: 'EUR' | 'GBP' = 'EUR'): number {
    // Calculate opening balance by reversing all transactions from current balance
    let openingBalance = currentBalance;
    
    for (const tx of transactions) {
      if (tx.type === 'debit') {
        openingBalance += tx.amount; // Add back debits
      } else {
        openingBalance -= tx.amount; // Subtract back credits
      }
    }
    
    const currencySymbol = this.getCurrencySymbol(currency);
    console.log(`Calculated opening balance: ${currencySymbol}${openingBalance.toFixed(2)} (current: ${currencySymbol}${currentBalance.toFixed(2)})`);
    return openingBalance;
  }
}