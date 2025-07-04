import PDFDocument from 'pdfkit';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

interface StatementData {
  user: {
    fullName: string;
    accountNumber: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    openingBalance: string;
    totalIn: string;
    totalOut: string;
    closingBalance: string;
  };
  transactions: Array<{
    date: string;
    description: string;
    withdrawal: string;
    deposit: string;
    balance: string;
  }>;
}

export async function generateStatementPDF(data: StatementData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create new PDF document in A4 size (595x842 points)
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0, // No margins since we're using a full-page template
        autoFirstPage: false
      });

      // Buffer to collect PDF data
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add a page and apply the background template
      doc.addPage();

      // Use the statement background template
      const templatePath = join(process.cwd(), 'attached_assets', 'IMG_1981_1751654672745.jpeg');
      
      if (existsSync(templatePath)) {
        // Embed the full-page template background at exact A4 dimensions
        doc.image(templatePath, 0, 0, {
          width: 595,  // A4 width in points
          height: 842  // A4 height in points
        });
      } else {
        // Fallback: Simple white background with BOI branding if template unavailable
        doc.rect(0, 0, 595, 842)
           .fill('#ffffff');
        
        // Add Bank of Ireland header
        doc.fontSize(16)
           .fillColor('#1a5490')
           .font('Helvetica-Bold')
           .text('Bank of Ireland', 50, 30);
        
        doc.fontSize(12)
           .fillColor('#000000')
           .font('Helvetica')
           .text('Account Statement', 50, 55);
      }

      // TOP-RIGHT BLOCK: Account information (final optimized BOI positioning)
      // Based on A4 dimensions (595x842pt) and authentic BOI statement layout
      const accountInfoX = 400; // Right-side positioning within A4 bounds
      const accountInfoY = 100;  // Optimal positioning under BOI logo area

      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica');

      // Get last 4 digits of account number for masking
      const lastFourDigits = data.user.accountNumber.slice(-4);
      
      // Account details with truncation handling for precise BOI format
      const truncatedName = data.user.fullName.length > 25 ? data.user.fullName.substring(0, 25) + '...' : data.user.fullName;
      doc.text(truncatedName, accountInfoX, accountInfoY, { align: 'left', width: 180 });
      doc.text(`****${lastFourDigits}`, accountInfoX, accountInfoY + 10, { align: 'left', width: 180 });
      doc.text(`${data.period.startDate} to ${data.period.endDate}`, accountInfoX, accountInfoY + 20, { align: 'left', width: 180 });

      // ACCOUNT SUMMARY (precise positioning for BOI statement template)
      // Positioned to align with template's account summary section
      const summaryX = 70;  // Slightly indented from left margin
      const summaryY = 200; // Higher positioning to align with template
      const lineHeight = 12; // Compact spacing for professional appearance

      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica');

      // BOI standard format with consistent EUR symbol usage
      const formatBalance = (amount: string) => {
        const cleanAmount = amount.replace(/[€EUR\s]/g, '');
        return `€${cleanAmount}`;
      };
      
      doc.text(`Opening Balance: ${formatBalance(data.summary.openingBalance)}`, summaryX, summaryY);
      doc.text(`Money In: ${formatBalance(data.summary.totalIn)}`, summaryX, summaryY + lineHeight);
      doc.text(`Money Out: ${formatBalance(data.summary.totalOut)}`, summaryX, summaryY + (lineHeight * 2));
      doc.text(`Closing Balance: ${formatBalance(data.summary.closingBalance)}`, summaryX, summaryY + (lineHeight * 3));

      // TRANSACTION TABLE (meticulously aligned with BOI template)
      // Fine-tuned positioning for authentic BOI statement appearance
      const tableStartY = 280; // Optimized position for template alignment
      const rowHeight = 15;     // Compact spacing matching authentic statements
      
      // Precisely calculated column positions for BOI template alignment
      const dateCol = 60;        // Date column positioning
      const descCol = 130;       // Description column  
      const withdrawalCol = 300; // Withdrawal amount (right-aligned in template box)
      const depositCol = 380;    // Deposit amount (right-aligned in template box)
      const balanceCol = 460;    // Running balance (right-aligned in template box)

      doc.fontSize(7)
         .fillColor('#000000')
         .font('Helvetica');

      // Render transactions with precise BOI statement formatting
      data.transactions.forEach((transaction, index) => {
        const rowY = tableStartY + (index * rowHeight);
        
        // Ensure we don't exceed template boundaries
        if (rowY > 600) return;

        // Format date to DD/MM/YYYY for BOI standard
        const formattedDate = transaction.date.length <= 10 ? transaction.date : transaction.date.substring(0, 10);
        
        doc.text(formattedDate, dateCol, rowY);
        doc.text(transaction.description.substring(0, 22), descCol, rowY); // Fit template width
        
        // Display withdrawal OR deposit with proper BOI formatting and alignment
        if (transaction.withdrawal && transaction.withdrawal !== '0.00' && transaction.withdrawal !== '' && transaction.withdrawal !== '€0.00') {
          // Remove EUR/€ symbol if present and ensure proper format
          const withdrawalAmount = transaction.withdrawal.replace(/[€EUR\s]/g, '');
          doc.text(`€${withdrawalAmount}`, withdrawalCol, rowY, { align: 'right', width: 70 });
        }
        
        if (transaction.deposit && transaction.deposit !== '0.00' && transaction.deposit !== '' && transaction.deposit !== '€0.00') {
          // Remove EUR/€ symbol if present and ensure proper format
          const depositAmount = transaction.deposit.replace(/[€EUR\s]/g, '');
          doc.text(`€${depositAmount}`, depositCol, rowY, { align: 'right', width: 70 });
        }
        
        // Format balance with EUR symbol for consistency
        const balanceAmount = transaction.balance.replace(/[€EUR\s]/g, '');
        doc.text(`€${balanceAmount}`, balanceCol, rowY, { align: 'right', width: 90 });
      });

      // ENDING BALANCE FOOTER (precisely positioned for BOI template)
      // Final balance positioned in template's designated footer area
      const footerY = 620; // Optimized footer position for template
      
      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica-Bold');

      // Ending balance with authentic BOI formatting and positioning
      const finalBalance = data.summary.closingBalance.replace(/[€EUR\s]/g, '');
      doc.text(`ENDING BALANCE: €${finalBalance}`, 
               300, footerY, { 
                 align: 'right',
                 width: 200 
               });

      // Finalize the PDF
      doc.end();

    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}

export function getStatementFilename(userLastName: string, statementDate: Date): string {
  const monthYear = statementDate.toLocaleDateString('en-GB', {
    month: '2-digit',
    year: 'numeric'
  }).replace('/', '');
  
  return `BOI_Statement_${userLastName}_${monthYear}.pdf`;
}