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
 * Generate authentic Bank of Ireland transfer confirmation PDF
 * matching the exact styling of real BOI statements
 */
export async function generateTransferConfirmationPDF(
  details: TransferPDFData,
  transferData?: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔵 GENERATING AUTHENTIC BOI TRANSFER CONFIRMATION PDF');
      
      const doc = new PDFDocument({ 
        margin: 50,
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
        console.log('✅ Authentic BOI transfer confirmation PDF completed, size:', pdfBuffer.length);
        resolve(pdfBuffer);
      });

      // Use the uploaded BOI logo that matches the statement
      const logoPath = path.join(process.cwd(), 'attached_assets', 'IMG_1957_1751635310015.webp');
      let logoAdded = false;

      try {
        if (fs.existsSync(logoPath)) {
          // Add BOI logo at top left exactly like the statement
          doc.image(logoPath, 50, 50, { width: 150, height: 40 });
          logoAdded = true;
          console.log('✅ Authentic BOI logo embedded in transfer confirmation');
        }
      } catch (logoError) {
        console.log('⚠️ Logo embedding failed, using BOI text header');
      }

      // Professional BOI text header if logo fails (matches statement styling)
      if (!logoAdded) {
        doc.font('Helvetica-Bold')
           .fontSize(20)
           .fillColor('#0066B2')
           .text('Bank of Ireland', 50, 50);
      }

      // Transfer summary section (right side like statement header)
      const currentDate = new Date().toLocaleDateString('en-IE', {
        day: '2-digit',
        month: '3-short',
        year: 'numeric'
      });

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#000000')
         .text('Transfer Type:', 300, 60)
         .font('Helvetica')
         .text('Transfer Confirmation', 400, 60);

      doc.font('Helvetica-Bold')
         .text('Transfer Date:', 300, 80)
         .font('Helvetica')
         .text(currentDate, 400, 80);

      doc.font('Helvetica-Bold')
         .text('Recipient Name:', 300, 100)
         .font('Helvetica')
         .text(details.recipientName, 400, 100);

      doc.font('Helvetica-Bold')
         .text('Amount:', 300, 120)
         .font('Helvetica-Bold')
         .fillColor('#0066B2')
         .text(`${details.currency}${details.amount}`, 400, 120);

      // Main title (like statement title)
      doc.font('Helvetica-Bold')
         .fontSize(18)
         .fillColor('#000000')
         .text('Transfer Confirmation', 50, 170, { align: 'center' });

      // Horizontal line separator (like in statement)
      doc.strokeColor('#000000')
         .lineWidth(1)
         .moveTo(50, 200)
         .lineTo(545, 200)
         .stroke();

      // Transfer Details section with clean horizontal layout
      let currentY = 230;

      // Determine transfer type for proper formatting
      const isUKTransfer = transferData?.paymentMethod === 'UK Transfer' || 
                         transferData?.recipientSortCode || 
                         transferData?.recipientAccountNumber;
      
      const isSEPATransfer = transferData?.paymentMethod === 'SEPA Transfer' || 
                            transferData?.iban || 
                            transferData?.bicCode ||
                            details.currency === '€';

      // Build details array for clean layout
      const transferDetails = [
        { label: 'Amount', value: `${details.currency}${details.amount}` },
        { label: 'To Account', value: details.recipientName }
      ];

      // Add account-specific details
      if (isUKTransfer) {
        transferDetails.push(
          { label: 'Account Number', value: transferData?.recipientAccountNumber || 'Not available' },
          { label: 'Sort Code', value: transferData?.recipientSortCode || 'Not available' }
        );
      } else if (isSEPATransfer) {
        transferDetails.push(
          { label: 'IBAN', value: transferData?.iban || 'Not available' },
          { label: 'BIC', value: transferData?.bicCode || 'Not available' }
        );
      }

      // Add remaining details
      const fullDateTime = new Date().toLocaleString('en-IE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Dublin'
      });

      transferDetails.push(
        { label: 'Reference', value: details.transactionReference },
        { label: 'Date/Time', value: fullDateTime },
        { label: 'Transaction ID', value: transferData?.id || 'Not available' },
        { label: 'Unique Reference', value: `BOI-${transferData?.id}-${isUKTransfer ? 'UK' : isSEPATransfer ? 'SEPA' : 'INT'}` }
      );

      // Render details in clean horizontal format (like statement)
      for (const detail of transferDetails) {
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor('#000000')
           .text(detail.label + ':', 70, currentY);
        
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#000000')
           .text(detail.value, 200, currentY);
        
        currentY += 18;
      }

      currentY += 30;

      // Horizontal separator
      doc.strokeColor('#cccccc')
         .lineWidth(1)
         .moveTo(50, currentY)
         .lineTo(545, currentY)
         .stroke();
      
      currentY += 40;

      // Security warning (matching BOI footer style)
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('#dc3545')
         .text('If you did not authorise this payment, contact 1800 123 456 immediately.', 50, currentY, { align: 'center' });
      
      currentY += 20;

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#666666')
         .text('This is an automated confirmation from Bank of Ireland. Do not reply.', 50, currentY, { align: 'center' });
      
      currentY += 20;

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('#000000')
         .text('Thank you for banking with Bank of Ireland.', 50, currentY, { align: 'center' });
      
      currentY += 15;

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#000000')
         .text('BOI Customer Service | www.bankofireland.com', 50, currentY, { align: 'center' });

      // Footer like BOI statement
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor('#999999')
         .text(`Page 1 of 1`, 50, 750, { align: 'right' });

      doc.end();
    } catch (error) {
      console.error('❌ Error generating authentic BOI transfer confirmation:', error);
      reject(error);
    }
  });
}