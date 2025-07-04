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

      // TOP-RIGHT BLOCK: Account information (positioned accurately for BOI template)
      // Based on authentic BOI statement analysis
      const topRightX = 320; // Adjusted for proper right-side positioning
      const topRightY = 150;  // Lower positioning under BOI logo area

      doc.fontSize(9)
         .fillColor('#000000')
         .font('Helvetica');

      // Get last 4 digits of account number for masking
      const lastFourDigits = data.user.accountNumber.slice(-4);
      
      doc.text(`Account Name: ${data.user.fullName}`, topRightX, topRightY, { align: 'left', width: 250 });
      doc.text(`Customer Number: ****${lastFourDigits}`, topRightX, topRightY + 12, { align: 'left', width: 250 });
      doc.text(`Statement Period: ${data.period.startDate} to ${data.period.endDate}`, topRightX, topRightY + 24, { align: 'left', width: 250 });

      // ACCOUNT SUMMARY (positioned to match authentic BOI statement layout)
      // Adjusted based on typical BOI statement positioning
      const summaryX = 50;  // Left margin alignment
      const summaryY = 250; // Positioned under account summary header
      const lineHeight = 14; // Tighter spacing for authentic look

      doc.fontSize(9)
         .fillColor('#000000') // Use black text for professional appearance
         .font('Helvetica');

      // Simple format matching authentic BOI statements
      doc.text(`Balance on ${data.period.startDate}: EUR ${data.summary.openingBalance}`, summaryX, summaryY);
      doc.text(`Total money in: EUR ${data.summary.totalIn}`, summaryX, summaryY + lineHeight);
      doc.text(`Total money out: EUR ${data.summary.totalOut}`, summaryX, summaryY + (lineHeight * 2));
      doc.text(`Balance on ${data.period.endDate}: EUR ${data.summary.closingBalance}`, summaryX, summaryY + (lineHeight * 3));

      // TRANSACTION TABLE (precisely aligned with BOI template rows)
      // Adjusted positioning based on authentic BOI statement analysis
      const tableStartY = 350; // Higher position to match template
      const rowHeight = 18;     // Tighter row spacing for more transactions
      
      // Column positions adjusted for authentic BOI statement alignment
      const dateCol = 50;        // Date column
      const descCol = 120;       // Description column  
      const withdrawalCol = 280; // Withdrawal column (right-aligned)
      const depositCol = 350;    // Deposit column (right-aligned)
      const balanceCol = 450;    // Running balance column (right-aligned)

      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica');

      // Render each transaction row with authentic BOI formatting
      data.transactions.forEach((transaction, index) => {
        const rowY = tableStartY + (index * rowHeight);
        
        // Skip if we exceed page boundaries
        if (rowY > 650) return;

        // Left-align text, right-align amounts (authentic BOI style)
        doc.text(transaction.date, dateCol, rowY);
        doc.text(transaction.description.substring(0, 25), descCol, rowY); // Longer descriptions
        
        // Show withdrawal OR deposit per row (not both) - right-aligned
        if (transaction.withdrawal && transaction.withdrawal !== '0.00') {
          doc.text(transaction.withdrawal, withdrawalCol, rowY, { align: 'right', width: 60 });
        }
        
        if (transaction.deposit && transaction.deposit !== '0.00') {
          doc.text(transaction.deposit, depositCol, rowY, { align: 'right', width: 60 });
        }
        
        doc.text(transaction.balance, balanceCol, rowY, { align: 'right', width: 80 });
      });

      // ENDING BALANCE FOOTER (positioned for authentic BOI statement)
      // Positioned in footer area to match template
      const footerY = 680; // Adjusted footer position
      
      doc.fontSize(9)
         .fillColor('#000000')
         .font('Helvetica-Bold');

      // Right-aligned ending balance in authentic BOI style
      doc.text(`Ending Balance: EUR ${data.summary.closingBalance}`, 
               350, footerY, { 
                 align: 'right',
                 width: 150 
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