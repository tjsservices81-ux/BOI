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

      // Add the actual Bank of Ireland logo at top left
      const logoPath = path.join(process.cwd(), 'attached_assets', 'IMG_1957_1751635910952.webp');
      let logoAdded = false;
      let startY = 80;

      // First try the uploaded authentic BOI logo
      try {
        if (fs.existsSync(logoPath)) {
          // Add authentic BOI logo at top left with proper sizing
          doc.image(logoPath, 60, 60, { width: 150, height: 45 });
          logoAdded = true;
          startY = 130;
          console.log('✅ Authentic Bank of Ireland logo embedded in PDF');
        }
      } catch (logoError) {
        console.log('⚠️ Primary logo failed, trying PNG alternatives...');
        
        // Try PNG alternatives if webp fails
        const pngOptions = [
          path.join(process.cwd(), 'BOI_logo.png'),
          path.join(process.cwd(), 'boi_app_icon.png'),
          path.join(process.cwd(), 'client', 'public', 'icons', 'boi-icon-192.png')
        ];

        for (const pngPath of pngOptions) {
          try {
            if (fs.existsSync(pngPath)) {
              doc.image(pngPath, 60, 60, { width: 150, height: 45 });
              logoAdded = true;
              startY = 130;
              console.log('✅ BOI logo embedded from PNG:', pngPath);
              break;
            }
          } catch (pngError) {
            continue;
          }
        }
      }

      // Only use text fallback if absolutely no logo works
      if (!logoAdded) {
        doc.font('Helvetica-Bold')
           .fontSize(24)
           .fillColor('#003366')
           .text('Bank of Ireland', 60, 60);
        startY = 100;
        console.log('⚠️ Using text header as logo fallback');
      }

      let currentY = startY + 20; // Add space below logo

      // Main heading - Transfer Confirmation
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor('#003366')
         .text('Transfer Confirmation', 60, currentY);
      
      currentY += 40;

      // Add a professional line separator
      doc.strokeColor('#003366')
         .lineWidth(2)
         .moveTo(60, currentY)
         .lineTo(535, currentY)
         .stroke();
      
      currentY += 25;

      // Transaction Details section header
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor('#003366')
         .text('Transaction Details', 60, currentY);
      
      currentY += 25;

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

      // Render details in clean, professional layout
      for (const detail of transactionDetails) {
        // Label (bold, left-aligned)
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor('#333333')
           .text(detail.label, 80, currentY, { width: 140, align: 'left' });
        
        // Value (regular or bold for amount)
        doc.font(detail.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(detail.bold ? 12 : 11)
           .fillColor(detail.bold ? '#003366' : '#000000')
           .text(detail.value, 220, currentY, { width: 300, align: 'left' });
        
        currentY += 18;
      }

      currentY += 30;

      // Add separator line
      doc.strokeColor('#dddddd')
         .lineWidth(1)
         .moveTo(60, currentY)
         .lineTo(535, currentY)
         .stroke();
      
      currentY += 25;

      // Security warning - Important notice
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor('#cc0000')
         .text('If you did not authorise this payment, contact 1800 123 456 immediately.', 
               60, currentY, { align: 'left' });
      
      currentY += 25;

      // Automated message
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#666666')
         .text('This is an automated confirmation from Bank of Ireland. Do not reply.', 
               60, currentY, { align: 'left' });
      
      currentY += 20;

      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor('#003366')
         .text('Thank you for banking with Bank of Ireland.', 
               60, currentY, { align: 'left' });
      
      currentY += 25;

      // Final footer
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#333333')
         .text('BOI Customer Service | www.bankofireland.com', 
               60, currentY, { align: 'left' });

      doc.end();
    } catch (error) {
      console.error('❌ Error generating professional BOI PDF:', error);
      reject(error);
    }
  });
}