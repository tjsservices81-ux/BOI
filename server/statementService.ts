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

      // TOP-RIGHT BLOCK: Account information (under Bank of Ireland logo)
      // Right-align text in top-right quadrant
      const topRightX = 400; // Right-aligned positioning
      const topRightY = 100;  // Under BOI logo

      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica');

      // Get last 4 digits of account number for masking
      const lastFourDigits = data.user.accountNumber.slice(-4);
      
      doc.text(`Account Name: ${data.user.fullName}`, topRightX, topRightY, { align: 'right', width: 180 });
      doc.text(`Customer Number: ****${lastFourDigits}`, topRightX, topRightY + 15, { align: 'right', width: 180 });
      doc.text(`Statement Period: ${data.period.startDate} to ${data.period.endDate}`, topRightX, topRightY + 30, { align: 'right', width: 180 });

      // ACCOUNT SUMMARY (left side, under "ACCOUNT SUMMARY" title)
      // Position aligned with blue "ACCOUNT SUMMARY" area
      const summaryX = 60;  // Left side positioning
      const summaryY = 280; // Under ACCOUNT SUMMARY title
      const lineHeight = 16; // Proper spacing

      doc.fontSize(10)
         .fillColor('#1a5490') // Blue color to match ACCOUNT SUMMARY
         .font('Helvetica-Bold');

      // Labels in bold blue, values in regular black
      doc.text(`Balance on ${data.period.startDate}:`, summaryX, summaryY);
      doc.fillColor('#000000').font('Helvetica').text(`EUR ${data.summary.openingBalance}`, summaryX + 120, summaryY);
      
      doc.fillColor('#1a5490').font('Helvetica-Bold').text(`Total money in:`, summaryX, summaryY + lineHeight);
      doc.fillColor('#000000').font('Helvetica').text(`EUR ${data.summary.totalIn}`, summaryX + 120, summaryY + lineHeight);
      
      doc.fillColor('#1a5490').font('Helvetica-Bold').text(`Total money out:`, summaryX, summaryY + (lineHeight * 2));
      doc.fillColor('#000000').font('Helvetica').text(`EUR ${data.summary.totalOut}`, summaryX + 120, summaryY + (lineHeight * 2));
      
      doc.fillColor('#1a5490').font('Helvetica-Bold').text(`Balance on ${data.period.endDate}:`, summaryX, summaryY + (lineHeight * 3));
      doc.fillColor('#000000').font('Helvetica').text(`EUR ${data.summary.closingBalance}`, summaryX + 120, summaryY + (lineHeight * 3));

      // TRANSACTION TABLE (aligned with green/blue row boxes)
      // Position to align with the template's transaction table area
      const tableStartY = 420; // Aligned with template transaction rows
      const rowHeight = 20;     // Proper row spacing
      
      // Column positions to align exactly with template boxes
      const dateCol = 60;        // Date column
      const descCol = 150;       // Description column  
      const withdrawalCol = 320; // Withdrawal column
      const depositCol = 400;    // Deposit column
      const balanceCol = 480;    // Running balance column

      doc.fontSize(9)
         .fillColor('#000000')
         .font('Helvetica');

      // Render each transaction row aligned with colored boxes
      data.transactions.forEach((transaction, index) => {
        const rowY = tableStartY + (index * rowHeight);
        
        // Skip if we exceed page boundaries
        if (rowY > 680) return;

        // Left-align text, right-align amounts
        doc.text(transaction.date, dateCol, rowY);
        doc.text(transaction.description.substring(0, 20), descCol, rowY); // Fit in box
        
        // Only show withdrawal OR deposit per row (not both)
        if (transaction.withdrawal && transaction.withdrawal !== '0.00') {
          doc.text(transaction.withdrawal, withdrawalCol, rowY, { align: 'right', width: 70 });
        }
        
        if (transaction.deposit && transaction.deposit !== '0.00') {
          doc.text(transaction.deposit, depositCol, rowY, { align: 'right', width: 70 });
        }
        
        doc.text(transaction.balance, balanceCol, rowY, { align: 'right', width: 80 });
      });

      // ENDING BALANCE FOOTER (in the final blue row)
      // Position in the blue footer area to match template design
      const footerY = 720; // Blue row at bottom
      
      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica-Bold');

      // Right-aligned ending balance matching template style
      doc.text(`Ending Balance                                    EUR ${data.summary.closingBalance}`, 
               200, footerY, { 
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