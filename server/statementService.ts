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

      // TOP-RIGHT BLOCK: Account information (millimeter-precise BOI positioning)
      // Authentic BOI statements: Account details positioned at specific coordinates
      const accountInfoX = 420; // 148mm from left edge (420pt = 148mm)
      const accountInfoY = 80;   // 28mm from top edge (80pt = 28mm)

      doc.fontSize(7)
         .fillColor('#000000')
         .font('Helvetica');

      // Get last 4 digits of account number for masking
      const lastFourDigits = data.user.accountNumber.slice(-4);
      
      // Account details with exact BOI format - clean, minimal presentation
      const truncatedName = data.user.fullName.length > 28 ? data.user.fullName.substring(0, 28) : data.user.fullName;
      doc.text(truncatedName.toUpperCase(), accountInfoX, accountInfoY);
      doc.text(`****${lastFourDigits}`, accountInfoX, accountInfoY + 8);
      
      // Statement period format: DD/MM/YYYY to DD/MM/YYYY
      doc.text(`${data.period.startDate} to ${data.period.endDate}`, accountInfoX, accountInfoY + 16);

      // ACCOUNT SUMMARY (100% accurate BOI template positioning)
      // Millimeter-perfect alignment with authentic BOI statement summary box
      const summaryX = 50;  // 17.6mm from left edge (exact template alignment)
      const summaryY = 165; // 58.2mm from top edge (perfect box positioning)
      const lineHeight = 10; // 3.5mm spacing (authentic BOI density)

      doc.fontSize(6.5)
         .fillColor('#000000')
         .font('Helvetica');

      // Exact BOI format - concise labels, precise amount alignment
      const formatBalance = (amount: string) => {
        return amount.replace(/[€EUR\s]/g, '');
      };
      
      // Format dates for summary labels
      const formatSummaryDate = (dateStr: string) => {
        return dateStr; // Keep DD/MM/YYYY format for summary
      };
      
      // Left-aligned descriptive labels, right-aligned amounts
      doc.text(`Balance on ${formatSummaryDate(data.period.startDate)}:`, summaryX, summaryY);
      doc.text(`€${formatBalance(data.summary.openingBalance)}`, summaryX + 90, summaryY, { align: 'right', width: 50 });
      
      doc.text('Total money in:', summaryX, summaryY + lineHeight);
      doc.text(`€${formatBalance(data.summary.totalIn)}`, summaryX + 90, summaryY + lineHeight, { align: 'right', width: 50 });
      
      doc.text('Total money out:', summaryX, summaryY + (lineHeight * 2));
      doc.text(`€${formatBalance(data.summary.totalOut)}`, summaryX + 90, summaryY + (lineHeight * 2), { align: 'right', width: 50 });
      
      doc.text(`Balance on ${formatSummaryDate(data.period.endDate)}:`, summaryX, summaryY + (lineHeight * 3));
      doc.text(`€${formatBalance(data.summary.closingBalance)}`, summaryX + 90, summaryY + (lineHeight * 3), { align: 'right', width: 50 });

      // TRANSACTION TABLE (100% precision BOI template alignment)
      // Absolute millimeter accuracy based on authentic BOI statement measurements
      const tableStartY = 220; // 77.6mm from top edge (exact template row start)
      const rowHeight = 12;     // 4.2mm row spacing (perfect BOI density)
      
      // Column positions calibrated to exact BOI template grid
      const dateCol = 50;        // 17.6mm from left (Date column precise)
      const descCol = 105;       // 37.0mm from left (Description column exact)
      const withdrawalCol = 270; // 95.2mm from left (Withdrawal right-aligned exact)
      const depositCol = 340;    // 120.0mm from left (Deposit right-aligned precise)
      const balanceCol = 410;    // 144.6mm from left (Balance right-aligned perfect)

      doc.fontSize(6)
         .fillColor('#000000')
         .font('Helvetica');

      // Render transactions with millimeter-precise BOI formatting
      data.transactions.forEach((transaction, index) => {
        const rowY = tableStartY + (index * rowHeight);
        
        // Respect authentic BOI statement page boundaries
        if (rowY > 550) return;

        // BOI date format: DD/MM/YY (shorter format for space efficiency)
        let formattedDate = transaction.date;
        if (formattedDate.length > 8) {
          const parts = formattedDate.split('/');
          if (parts.length === 3) {
            formattedDate = `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
          }
        }
        
        doc.text(formattedDate, dateCol, rowY);
        
        // Description: 20 characters max for authentic BOI width
        const desc = transaction.description.substring(0, 20).toUpperCase();
        doc.text(desc, descCol, rowY);
        
        // Amount formatting: Show ONLY withdrawal OR deposit, never both on same line
        if (transaction.withdrawal && transaction.withdrawal !== '0.00' && transaction.withdrawal !== '') {
          const amount = transaction.withdrawal.replace(/[€EUR\s]/g, '');
          doc.text(`€${amount}`, withdrawalCol, rowY, { align: 'right', width: 60 });
          // Ensure deposit column is empty
        } else if (transaction.deposit && transaction.deposit !== '0.00' && transaction.deposit !== '') {
          const amount = transaction.deposit.replace(/[€EUR\s]/g, '');
          doc.text(`€${amount}`, depositCol, rowY, { align: 'right', width: 60 });
          // Ensure withdrawal column is empty
        }
        
        // Running balance: Right-aligned in balance column with € symbol
        const balance = transaction.balance.replace(/[€EUR\s]/g, '');
        doc.text(`€${balance}`, balanceCol, rowY, { align: 'right', width: 80 });
      });

      // ENDING BALANCE FOOTER (millimeter-exact BOI positioning)
      // Positioned in authentic BOI statement footer at precise coordinates
      const footerY = 580; // 204.6mm from top edge (580pt = 204.6mm)
      
      doc.fontSize(7)
         .fillColor('#000000')
         .font('Helvetica-Bold');

      // Authentic BOI ending balance format - right-aligned in footer area
      const finalBalance = data.summary.closingBalance.replace(/[€EUR\s]/g, '');
      doc.text(`ENDING BALANCE €${finalBalance}`, 
               250, footerY, { 
                 align: 'right',
                 width: 250 
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