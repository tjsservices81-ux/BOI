import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface TransferPDFData {
  senderName: string;
  recipientName: string;
  amount: string;
  currency: string;
  transactionReference: string;
  dateTime: string;
  transferData?: any;
}

/**
 * Generate a professional Bank of Ireland transfer confirmation PDF
 * that matches authentic BOI document styling
 */
export async function generateTransferConfirmationPDF(
  details: TransferPDFData,
  transferData?: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔵 GENERATING PROFESSIONAL BOI PDF DOCUMENT');
      
      const doc = new PDFDocument({ 
        margin: 60,
        size: 'A4',
        info: {
          Title: `Transfer Confirmation - ${transferData?.id}`,
          Author: 'Bank of Ireland',
          Subject: 'Transfer Confirmation',
          Creator: 'BOI Digital Banking'
        }
      });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('✅ Professional BOI PDF completed, size:', pdfBuffer.length);
        resolve(pdfBuffer);
      });

      // Embed the authentic Bank of Ireland logo at top left corner
      const logoPath = path.join(process.cwd(), 'attached_assets', 'IMG_1957_1751636332135.webp');
      let logoAdded = false;
      let startY = 80;

      // Try the latest uploaded authentic BOI logo first
      try {
        if (fs.existsSync(logoPath)) {
          // Embed authentic BOI logo inline at top left (like real BOI documents)
          doc.image(logoPath, 50, 50, { width: 160, height: 48 });
          logoAdded = true;
          startY = 120;
          console.log('✅ Authentic Bank of Ireland logo embedded inline in PDF');
        }
      } catch (logoError) {
        console.log('⚠️ Primary logo failed, trying alternatives...');
        
        // Try backup logo files
        const backupLogos = [
          path.join(process.cwd(), 'attached_assets', 'IMG_1957_1751635910952.webp'),
          path.join(process.cwd(), 'BOI_logo.png'),
          path.join(process.cwd(), 'boi_app_icon.png')
        ];

        for (const backupPath of backupLogos) {
          try {
            if (fs.existsSync(backupPath)) {
              doc.image(backupPath, 50, 50, { width: 160, height: 48 });
              logoAdded = true;
              startY = 120;
              console.log('✅ BOI logo embedded from backup:', backupPath);
              break;
            }
          } catch (backupError) {
            continue;
          }
        }
      }

      // Minimal text fallback only if all logo attempts fail
      if (!logoAdded) {
        doc.font('Helvetica-Bold')
           .fontSize(18)
           .fillColor('#1a5490')
           .text('Bank of Ireland', 50, 60);
        startY = 100;
        console.log('⚠️ Using minimal text header as final fallback');
      }

      let currentY = startY + 30; // Professional spacing below logo

      // Main heading - Transfer Confirmation (matching real BOI documents)
      doc.font('Helvetica-Bold')
         .fontSize(20)
         .fillColor('#000000')
         .text('Transfer Confirmation', 50, currentY);
      
      currentY += 50;

      // Transaction Details section in boxed layout (like real BOI)
      doc.rect(50, currentY, 495, 25)
         .fillAndStroke('#f5f5f5', '#1a5490')
         .lineWidth(1);

      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor('#1a5490')
         .text('Transaction Details', 60, currentY + 7);
      
      currentY += 40;

      // Determine transfer type for proper formatting
      const isUKTransfer = transferData?.paymentMethod === 'UK Transfer' || 
                         transferData?.recipientSortCode || 
                         transferData?.recipientAccountNumber;
      
      const isSEPATransfer = transferData?.paymentMethod === 'SEPA Transfer' || 
                            transferData?.iban || 
                            transferData?.bicCode ||
                            details.currency === '€';

      // Build details array for structured layout
      const transactionDetails = [];
      
      // Common details
      transactionDetails.push(
        { label: 'Amount:', value: `${details.currency}${details.amount}`, bold: true },
        { label: 'To Account:', value: details.recipientName, bold: false }
      );

      // Add transfer-specific details
      if (isUKTransfer) {
        transactionDetails.push(
          { label: 'Account Number:', value: transferData?.recipientAccountNumber || 'Not available', bold: false },
          { label: 'Sort Code:', value: transferData?.recipientSortCode || 'Not available', bold: false }
        );
      } else if (isSEPATransfer) {
        transactionDetails.push(
          { label: 'IBAN:', value: transferData?.iban || 'Not available', bold: false },
          { label: 'BIC:', value: transferData?.bicCode || 'Not available', bold: false }
        );
      }

      // Add remaining details
      const currentDate = new Date().toLocaleString('en-IE', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Dublin'
      });

      transactionDetails.push(
        { label: 'Reference:', value: details.transactionReference, bold: false },
        { label: 'Date/Time:', value: currentDate, bold: false },
        { label: 'Transaction ID:', value: transferData?.id || 'Not available', bold: false },
        { label: 'Unique Reference:', value: `BOI-${transferData?.id}-${isUKTransfer ? 'UK' : isSEPATransfer ? 'SEPA' : 'INT'}`, bold: false }
      );

      // Render transaction details exactly like real BOI confirmations
      for (const detail of transactionDetails) {
        // Label (bold, consistent styling)
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor('#000000')
           .text(detail.label, 70, currentY, { width: 120, align: 'left' });
        
        // Value (regular or bold for amount, proper alignment)
        doc.font(detail.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(detail.bold ? 11 : 10)
           .fillColor(detail.bold ? '#1a5490' : '#000000')
           .text(detail.value, 200, currentY, { width: 320, align: 'left' });
        
        currentY += 16;
      }

      currentY += 25;

      // Separator line (like real BOI documents)
      doc.strokeColor('#cccccc')
         .lineWidth(1)
         .moveTo(50, currentY)
         .lineTo(545, currentY)
         .stroke();
      
      currentY += 20;

      // Red security warning (exactly like real BOI)
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('#cc0000')
         .text('If you did not authorise this payment, contact 1800 123 456 immediately.', 
               50, currentY);
      
      currentY += 20;

      // Grey automated message line (like real BOI)
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#777777')
         .text('This is an automated confirmation from Bank of Ireland. Please retain this document for your records.', 
               50, currentY);
      
      currentY += 25;

      // Blue footer section (matching real BOI style)
      doc.rect(50, currentY, 495, 35)
         .fillAndStroke('#1a5490', '#1a5490');

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#ffffff')
         .text('Thank you for banking with Bank of Ireland', 60, currentY + 8);
      
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#ffffff')
         .text('BOI Customer Service | www.bankofireland.com | 1800 123 456', 60, currentY + 22);

      currentY += 50;

      // Small grey generation info (like real BOI documents)
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor('#999999')
         .text(`Generated: ${new Date().toLocaleDateString('en-IE')} | Ref: ${transferData?.id || 'N/A'}`, 
               50, currentY, { align: 'left' });

      doc.end();
    } catch (error) {
      console.error('❌ Error generating professional BOI PDF:', error);
      reject(error);
    }
  });
}