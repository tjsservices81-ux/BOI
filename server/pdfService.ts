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
        margin: 40,
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

      // CORRECTED: Embed Bank of Ireland logo within proper margins
      const logoPath = path.join(process.cwd(), 'BOI_logo.png');
      let logoAdded = false;
      let startY = 120; // Content starts after logo area
      
      console.log('🔧 MARGIN-CORRECTED LOGO: Loading BOI logo from:', logoPath);
      console.log('🔧 File exists check:', fs.existsSync(logoPath));
      
      try {
        if (fs.existsSync(logoPath)) {
          console.log('✅ MARGIN FIX: BOI_logo.png found, embedding within margins...');
          
          // Add white background within proper margins (40px from edge + margin)
          doc.rect(50, 50, 160, 50)
             .fill('#ffffff');
          
          // Embed Bank of Ireland logo properly positioned within margins
          doc.image(logoPath, 50, 50, { 
            width: 160
          });
          
          logoAdded = true;
          startY = 120; // Content positioned below logo
          console.log('✅ MARGIN FIX: BOI logo embedded correctly at (50,50) within margins');
          
        } else {
          console.log('❌ MARGIN ERROR: BOI_logo.png not found at path');
        }
      } catch (error) {
        console.log('❌ MARGIN ERROR: Logo embedding failed:', (error as Error).message);
        console.log('❌ Error stack:', (error as Error).stack);
      }

      // Fallback with correct positioning
      if (!logoAdded) {
        console.log('⚠️ MARGIN FALLBACK: Creating text header within margins');
        doc.font('Helvetica-Bold')
           .fontSize(18)
           .fillColor('#1a5490')
           .text('Bank of Ireland', 50, 60);
        startY = 95;
      }

      let currentY = startY + 20; // Proper spacing below logo

      // Main heading - Transfer Confirmation (positioned within margins)
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor('#000000')
         .text('Transfer Confirmation', 50, currentY);
      
      currentY += 40;

      // Professional line separator (within margins)
      doc.strokeColor('#1a5490')
         .lineWidth(2)
         .moveTo(50, currentY)
         .lineTo(545, currentY)
         .stroke();
      
      currentY += 25;

      // Transaction Details section header (matching authentic BOI style)
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor('#1a5490')
         .text('Transaction Details', 50, currentY);
      
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

      // Render transaction details with authentic BOI formatting
      for (const detail of transactionDetails) {
        // Label (bold, left-aligned)
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor('#333333')
           .text(detail.label, 70, currentY);
        
        // Value (properly aligned and styled)
        doc.font(detail.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(detail.bold ? 12 : 11)
           .fillColor(detail.bold ? '#1a5490' : '#000000')
           .text(detail.value, 190, currentY);
        
        currentY += 18;
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