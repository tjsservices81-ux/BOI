import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function generateTransferConfirmationPDF(
  senderName: string,
  recipientName: string,
  amount: string,
  currency: string,
  transactionReference: string,
  accountInfo: string,
  transferData: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔵 NEW TEMPLATE-BASED PDF GENERATION');
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('✅ Template-based PDF completed, size:', pdfBuffer.length);
        resolve(pdfBuffer);
      });

      // Use the provided Bank of Ireland template as base
      const templatePath = path.join(process.cwd(), 'attached_assets', 'IMG_1972_1751639044089.png');
      
      console.log('🔧 TEMPLATE: Loading BOI template from:', templatePath);
      
      if (fs.existsSync(templatePath)) {
        console.log('✅ TEMPLATE: Found BOI template, using as base...');
        
        // Embed the template image as the full page background
        doc.image(templatePath, 0, 0, {
          width: 595.28,  // A4 width in points
          height: 841.89  // A4 height in points
        });
        
        console.log('✅ TEMPLATE: BOI template embedded as base');
        
      } else {
        console.log('❌ TEMPLATE ERROR: Template not found, using fallback');
        // Simple fallback if template is missing
        doc.rect(0, 0, 595, 842).fill('#f8f9fa');
        doc.font('Helvetica-Bold')
           .fontSize(24)
           .fillColor('#1a5490')
           .text('Bank of Ireland', 400, 50);
      }

      // Now overlay the transfer confirmation content on the template
      console.log('🔧 OVERLAY: Adding transfer confirmation content...');
      
      // Title positioned over the template with better spacing
      doc.font('Helvetica-Bold')
         .fontSize(20)
         .fillColor('#000000')
         .text('Transfer Confirmation', 50, 300);

      // Blue line under title
      doc.rect(50, 330, 495, 2)
         .fill('#1a5490');

      // Transaction Details Header Box
      doc.rect(50, 350, 495, 30)
         .fill('#f0f0f0')
         .stroke('#1a5490')
         .lineWidth(1);

      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor('#1a5490')
         .text('Transaction Details', 60, 360);

      // Transfer details content with improved spacing
      let yPos = 400;
      const leftCol = 60;
      const rightCol = 280;

      // Amount (highlighted)
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#000000')
         .text('Amount:', leftCol, yPos);
      
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#1a5490')
         .text(`${currency}${amount}`, rightCol, yPos);
      
      yPos += 30;

      // Add currency conversion for UK transfers
      if (transferData.exchangeRate && transferData.convertedAmount && transferData.convertedCurrency) {
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('#000000')
           .text('Converted Amount:', leftCol, yPos);
        
        doc.font('Helvetica')
           .fontSize(12)
           .fillColor('#1a5490')
           .text(`${transferData.convertedCurrency}${transferData.convertedAmount} (Rate: ${transferData.exchangeRate})`, rightCol, yPos);
        
        yPos += 30;
      }

      // To Account
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#000000')
         .text('To Account:', leftCol, yPos);
      
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#000000')
         .text(recipientName, rightCol, yPos);
      
      yPos += 30;

      // Account details based on transfer type
      if (transferData.recipientAccountNumber && transferData.recipientSortCode) {
        // UK Transfer
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('#000000')
           .text('Account Number:', leftCol, yPos);
        
        doc.font('Helvetica')
           .fontSize(12)
           .fillColor('#000000')
           .text(transferData.recipientAccountNumber, rightCol, yPos);
        
        yPos += 25;

        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('#000000')
           .text('Sort Code:', leftCol, yPos);
        
        doc.font('Helvetica')
           .fontSize(12)
           .fillColor('#000000')
           .text(transferData.recipientSortCode, rightCol, yPos);
        
        yPos += 30;
      }

      // Reference
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#000000')
         .text('Reference:', leftCol, yPos);
      
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#000000')
         .text(transactionReference, rightCol, yPos);
      
      yPos += 30;

      // Date/Time
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#000000')
         .text('Date/Time:', leftCol, yPos);
      
      const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#000000')
         .text(currentDate, rightCol, yPos);
      
      yPos += 30;

      // Transaction ID
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#000000')
         .text('Transaction ID:', leftCol, yPos);
      
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#000000')
         .text(transferData.id?.toString() || 'N/A', rightCol, yPos);
      
      yPos += 40;

      // Security warning (red text)
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor('#cc0000')
         .text('If you did not authorise this payment, contact 1800 123 456 immediately.', 50, yPos);

      yPos += 30;

      // Automated message
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#666666')
         .text('This is an automated confirmation from Bank of Ireland. Please retain this document for your records.', 50, yPos);

      // Footer section with blue background
      doc.rect(50, 750, 495, 40)
         .fill('#1a5490');

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#ffffff')
         .text('Thank you for banking with Bank of Ireland', 180, 765);

      // Bottom timestamp and reference
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor('#999999')
         .text(`Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} | Ref: ${transferData.id}`, 50, 810);

      console.log('✅ OVERLAY: Transfer confirmation content added');

      doc.end();

    } catch (error) {
      console.error('❌ PDF Generation Error:', error);
      reject(error);
    }
  });
}