import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateStatement = async (userData: any, period: string) => {
  try {
    console.log('🔵 Generating Bank of Ireland statement PDF for period:', period);
    
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
    
    // Calculate statement period dates
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '2weeks':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case '1month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
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
    
    // Account Name (uppercase)
    const fullName = (userData.firstName + ' ' + userData.lastName).toUpperCase();
    doc.text(fullName, 420, 80, {
      width: 150,
      align: 'right'
    });
    
    // Account Number (masked: ****[last 4 digits])
    const accountNumber = userData.accounts?.[0]?.accountNumber || '12345678';
    const maskedAccount = '****' + accountNumber.slice(-4);
    doc.text(maskedAccount, 420, 92, {
      width: 150,
      align: 'right'
    });
    
    // Statement Period (DD MMM YYYY - DD MMM YYYY format)
    doc.text(`${startDateStr} - ${endDateStr}`, 420, 104, {
      width: 150,
      align: 'right'
    });
    
    // Get real transactions from userData (exact data from user's screenshot)
    const allTransactions = userData.transactions || [];
    const filteredTransactions = allTransactions.filter((tx: any) => {
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate && !isNaN(txDate.getTime());
    });
    
    // ACCOUNT SUMMARY SECTION: user specification positioning
    doc.font('Helvetica').fontSize(6.5).fillColor('#000000');
    
    // Calculate totals from real transaction data
    let totalIn = 0;
    let totalOut = 0;
    
    filteredTransactions.forEach((tx: any) => {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'credit') {
        totalIn += amount;
      } else {
        totalOut += amount;
      }
    });
    
    // Get current balance
    const currentBalance = parseFloat(userData.accounts?.[0]?.balance || '1640.31');
    const openingBalance = currentBalance - totalIn + totalOut;
    
    // Balance on [Start Date]: x=50, y=160 (user specification)
    doc.text(`Balance on ${startDate.toLocaleDateString('en-GB')}:`, 50, 160);
    
    // Total money in/out: x=50, y=175 (user specification)
    doc.text('Total money in:', 50, 175);
    
    // Balance on [End Date]: x=50, y=190 (user specification)
    doc.text('Total money out:', 50, 185);
    doc.text(`Balance on ${endDate.toLocaleDateString('en-GB')}:`, 50, 195);
    
    // Labels left-aligned, values right-aligned (user specification)
    doc.text(`€${openingBalance.toFixed(2)}`, 200, 160, { align: 'right' });
    doc.text(`€${totalIn.toFixed(2)}`, 200, 175, { align: 'right' });
    doc.text(`€${totalOut.toFixed(2)}`, 200, 185, { align: 'right' });
    doc.text(`€${currentBalance.toFixed(2)}`, 200, 195, { align: 'right' });
    
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
    
    // Sort transactions by date (oldest first) for proper balance progression
    const sortedTransactions = [...filteredTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    console.log('📊 Processing transactions:', sortedTransactions.length);
    
    // Pull ALL real transactions from provided source (user specification)
    sortedTransactions.forEach((tx: any) => {
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
      
      // Balance column with € symbol
      doc.text(`€${parseFloat(tx.balance).toFixed(2)}`, 410, yPos, { width: 50, align: 'right' });
      
      yPos += 25; // 25px spacing as specified
      
      // Stop at page boundary
      if (yPos > 550) {
        return;
      }
    });
    
    // ENDING BALANCE: Helvetica-Bold 7pt, right-aligned in blue row (user specification)
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');
    doc.text(`Ending Balance €${currentBalance.toFixed(2)}`, 345, 580, {
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