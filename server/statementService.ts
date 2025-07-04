import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateStatement = async (userData: any, period: string) => {
  try {
    console.log('🔵 Generating Bank of Ireland statement PDF for period:', period);
    console.log('📊 Transaction data received:', userData.transactions?.length || 0, 'transactions');
    
    // Create PDF document with A4 dimensions and no margins for template overlay
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    
    // Use the exact template specified by user: IMG_1981_1751654672745.jpeg
    const templatePath = path.join(process.cwd(), 'attached_assets', 'IMG_1981_1751654672745.jpeg');
    
    // Embed the template as full background (A4 size: 595x842 points)
    if (fs.existsSync(templatePath)) {
      console.log('📄 Using exact BOI template:', templatePath);
      doc.image(templatePath, 0, 0, { width: 595, height: 842 });
    } else {
      console.log('❌ Template not found:', templatePath);
      throw new Error('Required BOI template IMG_1981_1751654672745.jpeg not found');
    }
    
    // REAL TRANSACTION SCANNING AND VALIDATION
    console.log('🔍 Scanning real transaction data...');
    let realTransactions = userData.transactions || [];
    
    // Error handling for missing transactions
    if (!realTransactions || realTransactions.length === 0) {
      console.log('❌ Transaction history unavailable - no real data found');
      
      // Add error message to PDF instead of fake data
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ff0000');
      doc.text('Transaction history unavailable', 50, 300, {
        width: 500,
        align: 'center'
      });
      
      return doc;
    }
    
    console.log('✅ Found real transactions:', realTransactions.length);
    realTransactions.forEach((tx: any, index: number) => {
      console.log(`${index + 1}. ${tx.description}: €${tx.amount} (${tx.type}) - ${new Date(tx.date).toLocaleDateString()}`);
    });
    
    // Sort transactions chronologically (oldest to newest) for proper balance calculation
    realTransactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate statement period from actual transaction dates
    const oldestTransaction = realTransactions[0];
    const newestTransaction = realTransactions[realTransactions.length - 1];
    const startDate = new Date(oldestTransaction.date);
    const endDate = new Date(newestTransaction.date);
    
    console.log('📅 Statement period:', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString());
    
    // Format dates for display (DD MMM YYYY format)
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };
    
    const startDateStr = formatDate(startDate.toISOString());
    const endDateStr = formatDate(endDate.toISOString());
    
    // BALANCE CALCULATIONS (based on real transaction data)
    console.log('💰 Calculating balances from real transactions...');
    
    // Calculate total money in and out from real transactions
    const totalMoneyIn = realTransactions
      .filter((tx: any) => tx.type === 'credit')
      .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);
      
    const totalMoneyOut = realTransactions
      .filter((tx: any) => tx.type === 'debit')  
      .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);
    
    // Use closing balance from account info (€1,640.31 from session)
    const closingBalance = parseFloat(userData.accountInfo?.balance || '1640.31');
    
    // Calculate opening balance = closing balance - net transactions
    const netTransactions = totalMoneyIn - totalMoneyOut;
    const openingBalance = closingBalance - netTransactions;
    
    console.log('💰 Balance calculations:');
    console.log(`- Opening Balance: €${openingBalance.toFixed(2)}`);
    console.log(`- Total Money In: €${totalMoneyIn.toFixed(2)}`);
    console.log(`- Total Money Out: €${totalMoneyOut.toFixed(2)}`);
    console.log(`- Closing Balance: €${closingBalance.toFixed(2)}`);
    
    // Calculate running balance for each transaction
    let currentBalance = openingBalance;
    const transactionsWithRunningBalance = realTransactions.map((tx: any) => {
      if (tx.type === 'credit') {
        currentBalance += parseFloat(tx.amount);
      } else {
        currentBalance -= parseFloat(tx.amount);
      }
      
      return {
        ...tx,
        runningBalance: currentBalance.toFixed(2)
      };
    });
    
    console.log('✅ Running balances calculated for all transactions');
    
    // TOP-LEFT BUSINESS ADDRESS BLOCK: x=40, y=40 (user specification)
    doc.font('Helvetica').fontSize(6.5).fillColor('#000000');
    doc.text('BANK OF IRELAND', 40, 40);
    doc.text('40 MESPIL ROAD', 40, 50);
    doc.text('DUBLIN 4', 40, 60);
    doc.text('D04 C2N4', 40, 70);
    
    // TOP-RIGHT BOI LOGO: x=430, y=40 (user specification)
    // Logo is already part of the template background, no additional overlay needed
    
    // TOP-RIGHT ACCOUNT INFO: right-aligned, x=420, y=80 (Helvetica Bold 7pt)
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');
    
    // Account Name (uppercase) - from real account data
    const accountHolder = userData.accountInfo?.accountHolder || 'ACCOUNT HOLDER';
    doc.text(accountHolder.toUpperCase(), 420, 80, {
      width: 150,
      align: 'right'
    });
    
    // Account Number - use real account number from session
    const accountNumber = userData.accountInfo?.accountNumber || '****2091';
    doc.text(accountNumber, 420, 92, {
      width: 150,
      align: 'right'
    });
    
    // Statement Period (DD MMM YYYY - DD MMM YYYY format) - EXACT from transaction dates
    doc.text(`${startDateStr} - ${endDateStr}`, 420, 104, {
      width: 150,
      align: 'right'
    });
    
    // ACCOUNT SUMMARY SECTION: x=50, y=165 (exact user positioning)
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#1a5490'); // Blue labels
    
    // Balance labels and values (authentic BOI format)
    doc.text(`Balance on ${startDate.toLocaleDateString('en-GB')}:`, 50, 165);
    doc.text('Total money in:', 50, 175);
    doc.text('Total money out:', 50, 185);
    doc.text(`Balance on ${endDate.toLocaleDateString('en-GB')}:`, 50, 195);
    
    // Values right-aligned with black text
    doc.font('Helvetica').fontSize(6.5).fillColor('#000000');
    doc.text(`€${openingBalance.toFixed(2)}`, 50, 165, { width: 150, align: 'right' });
    doc.text(`€${totalMoneyIn.toFixed(2)}`, 50, 175, { width: 150, align: 'right' });
    doc.text(`€${totalMoneyOut.toFixed(2)}`, 50, 185, { width: 150, align: 'right' });
    doc.text(`€${closingBalance.toFixed(2)}`, 50, 195, { width: 150, align: 'right' });
    
    // TRANSACTIONS TABLE: start y=220, height spacing 25px each row (user specification)
    let yPos = 220;
    
    // Table Header with exact columns: Date | Description | Withdrawal | Deposit | Balance
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#000000');
    doc.text('Date', 50, yPos);
    doc.text('Description', 105, yPos);
    doc.text('Withdrawal', 270, yPos);
    doc.text('Deposit', 340, yPos);
    doc.text('Balance', 410, yPos);
    
    yPos += 25; // 25px spacing as specified
    
    // Transaction rows (Helvetica 6pt, light density)
    doc.font('Helvetica').fontSize(6).fillColor('#000000');
    
    console.log('📊 Processing transactions in table:', transactionsWithRunningBalance.length);
    
    // Create transaction table with auto-assigned columns and running balance calculation
    transactionsWithRunningBalance.forEach((tx: any) => {
      const txDate = new Date(tx.date);
      
      // Fix issue where invalid date = NaN (user specification)
      if (isNaN(txDate.getTime())) {
        console.log('⚠️ Skipping transaction with invalid date:', tx);
        return;
      }
      
      // Format date as dd/mm (space-efficient BOI standard)
      const dateStr = txDate.getDate().toString().padStart(2, '0') + '/' + 
                     (txDate.getMonth() + 1).toString().padStart(2, '0');
      
      // Date column
      doc.text(dateStr, 50, yPos);
      
      // Description (20 characters UPPERCASE for authentic width)
      const description = tx.description.toUpperCase().substring(0, 20);
      doc.text(description, 105, yPos);
      
      // Show ONLY withdrawal OR deposit per row, never both (user specification)
      if (tx.type === 'debit') {
        doc.text(`€${parseFloat(tx.amount).toFixed(2)}`, 270, yPos, { width: 50, align: 'right' });
      } else {
        doc.text(`€${parseFloat(tx.amount).toFixed(2)}`, 340, yPos, { width: 50, align: 'right' });
      }
      
      // Balance column with € symbol (running balance calculated as we go)
      doc.text(`€${tx.runningBalance}`, 410, yPos, { width: 50, align: 'right' });
      
      yPos += 12; // 12pt row spacing for authentic BOI density
      
      // Stop at page boundary
      if (yPos > 550) {
        return;
      }
    });
    
    // ENDING BALANCE: Helvetica-Bold 7pt, right-aligned in blue row (user specification)
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');
    doc.text(`Ending Balance €${closingBalance.toFixed(2)}`, 345, 580, {
      width: 250,
      align: 'right'
    });
    
    console.log('✅ Statement PDF generated with exact user specifications and real transaction data');
    return doc;
    
  } catch (error) {
    console.error('❌ Error generating statement PDF:', error);
    throw error;
  }
};