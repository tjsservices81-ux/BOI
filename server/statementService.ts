import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

interface StatementRequest {
  accountId: string;
  startDate: string;
  endDate: string;
  dateRange: string;
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
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', reject);

      try {
        this.buildStatement(doc, request);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async buildStatement(doc: PDFKit.PDFDocument, request: StatementRequest) {
    // Add Bank of Ireland template as background
    if (fs.existsSync(this.templatePath)) {
      doc.image(this.templatePath, 0, 0, { 
        width: 595, 
        height: 842
      });
    }

    // Bank of Ireland Header
    this.addHeader(doc);
    
    // Get account and transaction data
    const accountData = await this.getAccountData(request.accountId);
    const transactions = await this.getTransactions(request);
    
    // Account information section
    this.addAccountInfo(doc, accountData, request);
    
    // Statement period
    this.addStatementPeriod(doc, request);
    
    // Account summary
    this.addAccountSummary(doc, accountData, transactions);
    
    // Transaction details
    this.addTransactionDetails(doc, transactions);
    
    // Footer with Bank of Ireland contact info
    this.addFooter(doc);
  }

  private addHeader(doc: PDFKit.PDFDocument) {
    // Bank of Ireland Blue Color
    const boiBlue = '#1a5490';
    
    // Account Statement text - moved down significantly
    doc.fontSize(18)
       .fillColor(boiBlue)
       .font('Helvetica')
       .text('Account Statement', 400, 150);
    
    // Bank address - moved down significantly
    doc.fontSize(10)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Head Office: 40 Mespil Road, Dublin 4, Ireland', 50, 180)
       .text('Phone: +353 1 611 1111 | www.bankofireland.com', 50, 195);
    
    // Horizontal line - moved down
    doc.moveTo(50, 215)
       .lineTo(545, 215)
       .strokeColor(boiBlue)
       .lineWidth(2)
       .stroke();
  }

  private addAccountInfo(doc: PDFKit.PDFDocument, account: Account, request: StatementRequest) {
    const startY = 235;
    
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
    const startY = 340;
    
    const startDate = new Date(request.startDate).toLocaleDateString('en-IE');
    const endDate = new Date(request.endDate).toLocaleDateString('en-IE');
    
    doc.fontSize(14)
       .fillColor('#1a5490')
       .font('Helvetica-Bold')
       .text('Statement Period', 50, startY);
    
    doc.fontSize(11)
       .fillColor('#333333')
       .font('Helvetica')
       .text(`From: ${startDate} to ${endDate}`, 50, startY + 25);
  }

  private addAccountSummary(doc: PDFKit.PDFDocument, account: Account, transactions: StatementTransaction[]) {
    const startY = 390;
    
    // Calculate totals
    const totalCredits = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalDebits = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const openingBalance = transactions.length > 0 ? 
      parseFloat(account.balance) - (totalCredits - totalDebits) : 
      parseFloat(account.balance);
    
    doc.fontSize(14)
       .fillColor('#1a5490')
       .font('Helvetica-Bold')
       .text('Account Summary', 50, startY);
    
    // Summary box
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
    
    doc.font('Helvetica-Bold')
       .text(`€${openingBalance.toFixed(2)}`, 450, startY + 45)
       .text(`€${totalCredits.toFixed(2)}`, 450, startY + 65)
       .text(`€${totalDebits.toFixed(2)}`, 450, startY + 85)
       .text(`€${account.balance}`, 450, startY + 105);
  }

  private addTransactionDetails(doc: PDFKit.PDFDocument, transactions: StatementTransaction[]) {
    let currentY = 500;
    
    doc.fontSize(14)
       .fillColor('#1a5490')
       .font('Helvetica-Bold')
       .text('Transaction Details', 50, currentY);
    
    currentY += 30;
    
    // Table headers
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
    
    // Transaction rows
    doc.font('Helvetica').fontSize(9);
    
    for (const transaction of transactions) {
      // Check if we need a new page
      if (currentY > 720) {
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
      
      const date = new Date(transaction.date).toLocaleDateString('en-IE');
      const amount = transaction.type === 'credit' ? 
        `+€${Math.abs(transaction.amount).toFixed(2)}` : 
        `-€${Math.abs(transaction.amount).toFixed(2)}`;
      
      doc.fillColor('#333333')
         .text(date, 50, currentY)
         .text(transaction.description.substring(0, 25), 120, currentY)
         .text(transaction.reference || '-', 300, currentY)
         .text(amount, 400, currentY)
         .text(`€${transaction.balance.toFixed(2)}`, 480, currentY);
      
      currentY += 20;
    }
    
    if (transactions.length === 0) {
      doc.fillColor('#666666')
         .text('No transactions found for this period.', 50, currentY);
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

  private async getAccountData(accountId: string): Promise<Account> {
    // Map account IDs to realistic account data
    const accountMap: Record<string, Account> = {
      "1": {
        id: "1",
        displayName: "Current Account",
        accountNumber: "12345091",
        sortCode: "90-12-34",
        balance: "2,450.67",
        accountType: "current"
      },
      "2": {
        id: "2", 
        displayName: "Credit Card",
        accountNumber: "12341820",
        sortCode: "90-12-34",
        balance: "1,250.00",
        accountType: "credit"
      },
      "3": {
        id: "3",
        displayName: "Savings Account", 
        accountNumber: "12340978",
        sortCode: "90-12-34",
        balance: "15,750.25",
        accountType: "savings"
      }
    };

    const account = accountMap[accountId];
    if (!account) {
      // Default account if ID not found
      return {
        id: accountId,
        displayName: "Current Account",
        accountNumber: "12345678",
        sortCode: "90-12-34", 
        balance: "2,450.67",
        accountType: "current"
      };
    }

    return account;
  }

  private async getTransactions(request: StatementRequest): Promise<StatementTransaction[]> {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    
    // Generate sample transactions for demonstration
    // In production, this would fetch from your actual database
    
    // Create sample transactions within the requested date range
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const baseDate = new Date(startDate);
    
    const sampleTransactions: StatementTransaction[] = [
      {
        id: 'tx001',
        date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Online Purchase - Amazon',
        amount: 45.99,
        type: 'debit',
        balance: 2450.67,
        reference: 'AMZ001',
        category: 'Shopping'
      },
      {
        id: 'tx002',
        date: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Salary Payment',
        amount: 3200.00,
        type: 'credit',
        balance: 2496.66,
        reference: 'SAL001',
        category: 'Income'
      },
      {
        id: 'tx003',
        date: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Grocery Store - Tesco',
        amount: 78.34,
        type: 'debit',
        balance: 1703.34,
        reference: 'TSC001',
        category: 'Groceries'
      },
      {
        id: 'tx004',
        date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Utility Bill - Electric Ireland',
        amount: 120.45,
        type: 'debit',
        balance: 1781.68,
        reference: 'EI001',
        category: 'Utilities'
      },
      {
        id: 'tx005',
        date: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'ATM Withdrawal',
        amount: 100.00,
        type: 'debit',
        balance: 1681.68,
        reference: 'ATM001',
        category: 'Cash'
      },
      {
        id: 'tx006',
        date: new Date(baseDate.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Direct Debit - Mortgage',
        amount: 1250.00,
        type: 'debit',
        balance: 431.68,
        reference: 'MTG001',
        category: 'Housing'
      },
      {
        id: 'tx007',
        date: new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Online Transfer - Savings',
        amount: 500.00,
        type: 'debit',
        balance: 1181.68,
        reference: 'TRF001',
        category: 'Transfer'
      },
      {
        id: 'tx008',
        date: new Date(baseDate.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Pension Payment',
        amount: 800.00,
        type: 'credit',
        balance: 1981.68,
        reference: 'PEN001',
        category: 'Income'
      }
    ];
    
    // Filter transactions by date range
    const filteredTransactions = sampleTransactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return filteredTransactions;
  }
}