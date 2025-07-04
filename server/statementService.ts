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

      // Use the new statement background template
      const templatePath = join(process.cwd(), 'attached_assets', 'IMG_1981_1751653862587.jpeg');
      
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

      // BANK ADDRESS (top left - matching template)
      const addressX = 50;
      const addressY = 80;
      
      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica');
      
      doc.text('Bank of Ireland (UK) plc', addressX, addressY);
      doc.text('Bow Bells House', addressX, addressY + 10);
      doc.text('1 Bread Street', addressX, addressY + 20);
      doc.text('London EC4M 9BE', addressX, addressY + 30);

      // ACCOUNT INFORMATION BLOCK (right side of header)
      const accountInfoX = 350;
      const accountInfoY = 80;

      doc.fontSize(9)
         .fillColor('#000000')
         .font('Helvetica');

      doc.text(`Account Name: ${data.user.fullName}`, accountInfoX, accountInfoY);
      doc.text(`Account Number: ${data.user.accountNumber}`, accountInfoX, accountInfoY + 12);
      doc.text(`Statement Period: ${data.period.startDate} to ${data.period.endDate}`, accountInfoX, accountInfoY + 24);
      doc.text(`Statement Date: ${new Date().toLocaleDateString('en-GB')}`, accountInfoX, accountInfoY + 36);

      // ACCOUNT SUMMARY (positioned to match template layout)
      const summaryX = 60;
      const summaryY = 180;
      const lineHeight = 14;

      doc.fontSize(9)
         .fillColor('#000000')
         .font('Helvetica-Bold');
      
      doc.text('ACCOUNT SUMMARY', summaryX, summaryY);
      
      doc.font('Helvetica')
         .fontSize(8);

      doc.text(`Opening Balance (${data.period.startDate}): EUR ${data.summary.openingBalance}`, summaryX, summaryY + 20);
      doc.text(`Total Credits: EUR ${data.summary.totalIn}`, summaryX, summaryY + 34);
      doc.text(`Total Debits: EUR ${data.summary.totalOut}`, summaryX, summaryY + 48);
      doc.text(`Closing Balance (${data.period.endDate}): EUR ${data.summary.closingBalance}`, summaryX, summaryY + 62);

      // TRANSACTION TABLE (positioned to match template)
      const tableStartY = 320;
      const rowHeight = 16;
      
      // Column positions matching template layout
      const dateCol = 60;
      const descCol = 140;
      const withdrawalCol = 280;
      const depositCol = 380;
      const balanceCol = 480;

      // Table header
      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica-Bold');
      
      doc.text('Date', dateCol, tableStartY);
      doc.text('Description', descCol, tableStartY);
      doc.text('Debit', withdrawalCol, tableStartY);
      doc.text('Credit', depositCol, tableStartY);
      doc.text('Balance', balanceCol, tableStartY);

      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica');

      // Render each transaction row (starting after header)
      data.transactions.forEach((transaction, index) => {
        const rowY = tableStartY + 20 + (index * rowHeight); // Start after header
        
        // Skip if we exceed page boundaries
        if (rowY > 750) return;

        doc.text(transaction.date, dateCol, rowY);
        doc.text(transaction.description.substring(0, 30), descCol, rowY);
        
        if (transaction.withdrawal) {
          doc.text(`EUR ${transaction.withdrawal}`, withdrawalCol, rowY);
        }
        
        if (transaction.deposit) {
          doc.text(`EUR ${transaction.deposit}`, depositCol, rowY);
        }
        
        doc.text(`EUR ${transaction.balance}`, balanceCol, rowY);
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