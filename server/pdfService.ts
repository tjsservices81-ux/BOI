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

      // Add Bank of Ireland logo with proper spacing
      let logoAdded = false;
      let startY = 80;

      // Try multiple logo file formats
      const logoOptions = [
        path.join(process.cwd(), 'BOI_logo.png'),
        path.join(process.cwd(), 'boi_app_icon.png'),
        path.join(process.cwd(), 'client', 'public', 'icons', 'boi-icon-192.png')
      ];

      for (const logoPath of logoOptions) {
        try {
          if (fs.existsSync(logoPath)) {
            // Add logo at top left with professional spacing
            doc.image(logoPath, 60, 60, { width: 180, height: 50 });
            logoAdded = true;
            startY = 140;
            console.log('✅ Authentic BOI logo embedded in PDF from:', logoPath);
            break;
          }
        } catch (logoError) {
          console.log('⚠️ Logo attempt failed for', logoPath, ':', logoError.message);
          continue;
        }
      }

      // Professional fallback header if logo fails
      if (!logoAdded) {
        // Create a professional text-based header with BOI styling
        doc.rect(60, 60, 475, 50)
           .fillAndStroke('#003f7f', '#003f7f');
        
        doc.font('Helvetica-Bold')
           .fontSize(28)
           .fillColor('#ffffff')
           .text('Bank of Ireland', 80, 75, { align: 'left' });
           
        doc.font('Helvetica')
           .fontSize(12)
           .fillColor('#ffffff')
           .text('Digital Banking Services', 80, 100, { align: 'left' });
        
        startY = 140;
        console.log('✅ Professional BOI text header created');
      }

      let currentY = startY;

      // Main heading with professional spacing
      doc.font('Helvetica-Bold')
         .fontSize(24)
         .fillColor('#000000')
         .text('Transfer Confirmation', 60, currentY, { align: 'left' });
      
      currentY += 50;

      // Professional blue line separator
      doc.strokeColor('#003f7f')
         .lineWidth(3)
         .moveTo(60, currentY)
         .lineTo(535, currentY)
         .stroke();
      
      currentY += 30;

      // Transaction Details heading with box styling
      doc.rect(60, currentY, 475, 30)
         .fillAndStroke('#f8f9fa', '#003f7f')
         .lineWidth(1);

      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor('#003f7f')
         .text('Transaction Details', 75, currentY + 8);
      
      currentY += 50;

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

      // Render details in professional two-column layout
      for (const detail of transactionDetails) {
        // Label column (bold, right-aligned)
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor('#333333')
           .text(detail.label, 80, currentY, { width: 150, align: 'left' });
        
        // Value column
        doc.font(detail.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(11)
           .fillColor(detail.bold ? '#003f7f' : '#000000')
           .text(detail.value, 240, currentY, { width: 280, align: 'left' });
        
        currentY += 20;
      }

      currentY += 40;

      // Professional separator
      doc.strokeColor('#cccccc')
         .lineWidth(1)
         .moveTo(60, currentY)
         .lineTo(535, currentY)
         .stroke();
      
      currentY += 30;

      // Security warning in red alert box
      doc.rect(60, currentY, 475, 35)
         .fillAndStroke('#fff5f5', '#dc3545')
         .lineWidth(2);
      
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor('#dc3545')
         .text('⚠ If you did not authorise this payment, contact 1800 123 456 immediately.', 
               80, currentY + 12, { width: 435, align: 'center' });
      
      currentY += 55;

      // Automated message disclaimer
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#6c757d')
         .text('This is an automated confirmation from Bank of Ireland. Please retain this document for your records.', 
               60, currentY, { width: 475, align: 'center' });
      
      currentY += 30;

      // Professional footer section with BOI branding
      doc.strokeColor('#003f7f')
         .lineWidth(2)
         .moveTo(60, currentY)
         .lineTo(535, currentY)
         .stroke();
      
      currentY += 25;

      // Footer content
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor('#003f7f')
         .text('Thank you for banking with Bank of Ireland', 60, currentY, { align: 'center' });
      
      currentY += 25;

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#333333')
         .text('BOI Customer Service | www.bankofireland.com | 1800 123 456', 60, currentY, { align: 'center' });

      // Document metadata at bottom
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor('#999999')
         .text(`Document generated: ${new Date().toLocaleDateString('en-IE')} | Ref: ${transferData?.id || 'N/A'}`, 
               60, 760, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('❌ Error generating professional BOI PDF:', error);
      reject(error);
    }
  });
}