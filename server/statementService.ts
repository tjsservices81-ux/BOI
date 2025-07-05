import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

interface StatementRequest {
  accountId: string;
  startDate: string;
  endDate: string;
  dateRange: string;
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
      // Get account and transaction data using real user data
      const accountData = await this.getAccountData(request.accountId, request.userAccounts);
      const transactions = await this.getTransactions(request);
      
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
      }

      // Add all content sections synchronously to avoid race conditions
      this.addHeader(doc);
      this.addAccountInfo(doc, accountData, request);
      this.addStatementPeriod(doc, request);
      this.addAccountSummary(doc, accountData, transactions);
      this.addTransactionDetails(doc, transactions);
      this.addFooter(doc);
      
    } catch (error) {
      console.error('Error building statement:', error);
      throw error;
    }
  }

  private addHeader(doc: PDFKit.PDFDocument) {
    // Bank of Ireland Blue Color
    const boiBlue = '#1a5490';
    
    // Account Statement text - moved much lower to avoid template overlap
    doc.fontSize(18)
       .fillColor(boiBlue)
       .font('Helvetica')
       .text('Account Statement', 400, 320);
    
    // Bank address - moved much lower
    doc.fontSize(10)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Head Office: 40 Mespil Road, Dublin 4, Ireland', 50, 350)
       .text('Phone: +353 1 611 1111 | www.bankofireland.com', 50, 365);
    
    // Horizontal line - moved much lower
    doc.moveTo(50, 385)
       .lineTo(545, 385)
       .strokeColor(boiBlue)
       .lineWidth(2)
       .stroke();
  }

  private addAccountInfo(doc: PDFKit.PDFDocument, account: Account, request: StatementRequest) {
    const startY = 405; // Moved much lower
    
    doc.fontSize(14)
       .fillColor('#1a5490')
       .font('Helvetica-Bold')
       .text('Account Information', 50, startY);
    
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica')
       .text(`Account Name: ${account.displayName}`, 50, startY + 25)
       .text(`Account Number: ${account.accountNumber}`, 50, startY + 45)
       .text(`Sort Code: ${account.sortCode}`, 50, startY + 65)
       .text(`Account Type: ${account.accountType}`, 50, startY + 85);
    
    // Statement date
    const statementDate = new Date().toLocaleDateString('en-IE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    doc.text(`Statement Date: ${statementDate}`, 350, startY + 25)
       .text(`Statement Period: ${request.dateRange}`, 350, startY + 45);
  }

  private addStatementPeriod(doc: PDFKit.PDFDocument, request: StatementRequest) {
    const startY = 510; // Moved much lower
    
    // Calculate actual current period dates based on range selection
    const endDate = new Date();
    const startDate = new Date();
    
    switch (request.dateRange) {
      case '1week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '2weeks':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case '1month':
      default:
        startDate.setDate(endDate.getDate() - 30);
        break;
    }
    
    const startDateStr = startDate.toLocaleDateString('en-IE');
    const endDateStr = endDate.toLocaleDateString('en-IE');
    
    doc.fontSize(14)
       .fillColor('#1a5490')
       .font('Helvetica-Bold')
       .text('Statement Period', 50, startY);
    
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica')
       .text(`From: ${startDateStr} to ${endDateStr}`, 50, startY + 25);
  }

  private addAccountSummary(doc: PDFKit.PDFDocument, account: Account, transactions: StatementTransaction[]) {
    const startY = 560; // Moved much lower
    
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
       .fillColor('#1a5490')
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
    
    // Right-align amounts matching your statement format
    doc.font('Helvetica-Bold')
       .text(`€${openingBalance.toFixed(2)}`, 450, startY + 45)
       .text(`€${totalCredits.toFixed(2)}`, 450, startY + 65)
       .text(`€${totalDebits.toFixed(2)}`, 450, startY + 85)
       .text(`€${closingBalance.toFixed(2)}`, 450, startY + 105);
  }

  private addTransactionDetails(doc: PDFKit.PDFDocument, transactions: StatementTransaction[]) {
    let currentY = 690; // Moved much lower to avoid overlap
    
    doc.fontSize(14)
       .fillColor('#1a5490')
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
    
    for (const transaction of transactions) {
      // Check if we need a new page (allow more room on first page)
      // Standard A4 page height is 842 points, leave 50 points margin at bottom
      if (currentY > 790) {
        doc.addPage();
        currentY = 50;
        
        // Add header on new page
        doc.fontSize(14)
           .fillColor('#1a5490')
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
      
      // Format date to match your statement (5/7/2025 format)
      const date = new Date(transaction.date).toLocaleDateString('en-US');
      const amount = transaction.type === 'credit' ? 
        `+€${transaction.amount.toFixed(2)}` : 
        `-€${transaction.amount.toFixed(2)}`;
      
      doc.fillColor('#333333')
         .text(date, 50, currentY)
         .text(transaction.description.substring(0, 30), 120, currentY)
         .text(transaction.reference || '-', 300, currentY)
         .text(amount, 400, currentY)
         .text(`€${transaction.balance.toFixed(2)}`, 480, currentY);
      
      currentY += 20;
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
    
    // Footer line
    doc.moveTo(50, footerY)
       .lineTo(545, footerY)
       .strokeColor('#1a5490')
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
    
    // Use real account data passed from frontend
    const selectedAccount = userAccounts.find(acc => acc.id.toString() === accountId);
    if (!selectedAccount) {
      const availableIds = userAccounts.map(acc => acc.id).join(', ');
      throw new Error(`Account ${accountId} not found. Available accounts: ${availableIds}. App may need to be restored from backup.`);
    }
    
    // Return real account data
    return {
      id: accountId,
      displayName: selectedAccount.displayName,
      accountNumber: selectedAccount.accountNumber,
      sortCode: selectedAccount.sortCode || "90-12-34",
      balance: selectedAccount.balance,
      accountType: selectedAccount.accountType
    };
  }

  private async getTransactions(request: StatementRequest): Promise<StatementTransaction[]> {
    // Use real transaction data from frontend if provided, otherwise use mock data
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate date range
      switch (request.dateRange) {
        case '1week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '2weeks':
          startDate.setDate(endDate.getDate() - 14);
          break;
        case '1month':
        default:
          startDate.setDate(endDate.getDate() - 30);
          break;
      }

      // Handle app reset and new account scenarios properly
      if (!request.userTransactions || request.userTransactions.length === 0) {
        console.log('No transaction history found - app may have been reset to defaults or account has no activity');
        return [];
      }
      
      const userTransactions = request.userTransactions;
      
      // Filter transactions for the specified account and date range
      const filteredTransactions = userTransactions
        .filter((tx) => {
          const transactionDate = new Date(tx.timestamp);
          const matchesAccount = tx.accountId.toString() === request.accountId;
          const inDateRange = transactionDate >= startDate && transactionDate <= endDate;
          return matchesAccount && inDateRange;
        });

      // Convert to statement format
      const statementTransactions: StatementTransaction[] = filteredTransactions
        .map((tx: any) => ({
          id: tx.id.toString(),
          date: tx.timestamp,
          description: tx.description,
          amount: Math.abs(parseFloat(tx.amount.replace('-', ''))),
          type: tx.type as 'credit' | 'debit',
          balance: 0, // Will be calculated below
          reference: tx.reference || `TXN${tx.id}`,
          category: tx.category
        }))
        .sort((a: StatementTransaction, b: StatementTransaction) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balances using real account data
      const currentAccountBalance = this.getRealAccountBalance(request.accountId, request.userAccounts);
      let runningBalance = this.calculateOpeningBalance(currentAccountBalance, statementTransactions);
      
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

  private getRealAccountBalance(accountId: string, userAccounts?: any[]): number {
    if (!userAccounts) {
      throw new Error('User account data required for authentic balance calculation');
    }
    
    const selectedAccount = userAccounts.find(acc => acc.id.toString() === accountId);
    if (!selectedAccount) {
      throw new Error(`Account ${accountId} not found in user accounts`);
    }
    
    // Parse actual account balance, removing commas and converting to number
    const balance = parseFloat(selectedAccount.balance.replace(/,/g, ''));
    console.log(`Real account ${accountId} balance: €${balance.toFixed(2)}`);
    return balance;
  }

  private calculateOpeningBalance(currentBalance: number, transactions: StatementTransaction[]): number {
    // Calculate opening balance by reversing all transactions from current balance
    let openingBalance = currentBalance;
    
    for (const tx of transactions) {
      if (tx.type === 'debit') {
        openingBalance += tx.amount; // Add back debits
      } else {
        openingBalance -= tx.amount; // Subtract back credits
      }
    }
    
    console.log(`Calculated opening balance: €${openingBalance.toFixed(2)} (current: €${currentBalance.toFixed(2)})`);
    return openingBalance;
  }
}