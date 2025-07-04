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
      const templatePath = join(process.cwd(), 'attached_assets', 'IMG_1981_1751652629227.jpeg');
      
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
      // Position: x: 140mm (≈ 396 points), y: 62mm (≈ 176 points)
      const topRightX = 396; // 140mm in points
      const topRightY = 176;  // 62mm in points

      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica');

      doc.text(`Account Name: ${data.user.fullName}`, topRightX, topRightY);
      doc.text(`Account Number: ${data.user.accountNumber}`, topRightX, topRightY + 14);
      doc.text(`Statement Period: ${data.period.startDate} to ${data.period.endDate}`, topRightX, topRightY + 28);

      // ACCOUNT SUMMARY (left side, under "ACCOUNT SUMMARY")
      // Position: x: 20mm (≈ 57 points), y: 95mm (≈ 269 points)
      const summaryX = 57;  // 20mm in points
      const summaryY = 269; // 95mm in points
      const lineHeight = 17; // 6mm in points

      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica');

      doc.text(`Balance on ${data.period.startDate}: EUR ${data.summary.openingBalance}`, summaryX, summaryY);
      doc.text(`Total money in: EUR ${data.summary.totalIn}`, summaryX, summaryY + lineHeight);
      doc.text(`Total money out: EUR ${data.summary.totalOut}`, summaryX, summaryY + (lineHeight * 2));
      doc.text(`Balance on ${data.period.endDate}: EUR ${data.summary.closingBalance}`, summaryX, summaryY + (lineHeight * 3));

      // TRANSACTION TABLE (below the blue header row)
      // Position: y: 140mm (≈ 397 points)
      const tableStartY = 397; // 140mm in points
      const rowHeight = 34;     // 12mm in points
      
      // Column positions to align with template
      const dateCol = 57;        // 20mm
      const descCol = 142;       // 50mm  
      const withdrawalCol = 312;  // 110mm
      const depositCol = 397;     // 140mm
      const balanceCol = 482;     // 170mm

      doc.fontSize(9)
         .fillColor('#000000')
         .font('Helvetica');

      // Render each transaction row
      data.transactions.forEach((transaction, index) => {
        const rowY = tableStartY + (index * rowHeight);
        
        // Skip if we exceed page boundaries
        if (rowY > 750) return;

        doc.text(transaction.date, dateCol, rowY);
        doc.text(transaction.description.substring(0, 25), descCol, rowY); // Truncate long descriptions
        
        if (transaction.withdrawal) {
          doc.text(transaction.withdrawal, withdrawalCol, rowY);
        }
        
        if (transaction.deposit) {
          doc.text(transaction.deposit, depositCol, rowY);
        }
        
        doc.text(transaction.balance, balanceCol, rowY);
      });

      // ENDING BALANCE FOOTER (in the final blue row)
      // Position in the blue footer area at bottom
      const footerY = 750; // Bottom area of the page
      
      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica-Bold');

      // Right-aligned ending balance in the footer
      doc.text(`Ending Balance                EUR ${data.summary.closingBalance}`, 
               300, footerY, { 
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