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

      // VISUAL VERIFICATION: Embed Bank of Ireland logo at top-left
      const logoPath = path.join(process.cwd(), 'BOI_logo.png');
      let logoAdded = false;
      let startY = 150; // Increased to ensure logo has space
      
      console.log('🔍 VISUAL LOGO CHECK: Loading BOI logo from:', logoPath);
      console.log('🔍 File exists check:', fs.existsSync(logoPath));
      
      // First, add a test rectangle to verify positioning works
      doc.rect(40, 40, 160, 50)
         .stroke('#ff0000')
         .lineWidth(1);
      console.log('✅ TEST: Red rectangle drawn at logo position for verification');
      
      try {
        if (fs.existsSync(logoPath)) {
          console.log('✅ VISUAL: BOI_logo.png found, now embedding...');
          
          // Embed logo with explicit parameters and larger area
          doc.image(logoPath, 40, 40, { 
            width: 160,
            height: 50,
            fit: [160, 50]
          });
          
          logoAdded = true;
          startY = 110; // Position content below logo
          console.log('✅ VISUAL CONFIRMED: BOI logo embedded at (40,40) with width 160px');
          
          // Add a border around logo for verification
          doc.rect(39, 39, 162, 52)
             .stroke('#0000ff')
             .lineWidth(1);
          console.log('✅ VISUAL: Blue border added around logo for verification');
          
        } else {
          console.log('❌ VISUAL ERROR: BOI_logo.png not found at path');
        }
      } catch (error) {
        console.log('❌ VISUAL ERROR: Logo embedding failed:', (error as Error).message);
        console.log('❌ Error stack:', (error as Error).stack);
      }

      // Fallback only if logo completely fails
      if (!logoAdded) {
        console.log('⚠️ VISUAL FALLBACK: Creating text header');
        doc.font('Helvetica-Bold')
           .fontSize(18)
           .fillColor('#1a5490')
           .text('Bank of Ireland', 40, 50);
        startY = 85;
      }

      let currentY = startY + 30; // Ensure content is well below logo

      // Main heading - Transfer Confirmation (bold, positioned below logo)
      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor('#000000')
         .text('Transfer Confirmation', 40, currentY);
      
      currentY += 40;

      // Professional line separator
      doc.strokeColor('#1a5490')
         .lineWidth(2)
         .moveTo(40, currentY)
         .lineTo(555, currentY)
         .stroke();
      
      currentY += 25;

      // Transaction Details section header (matching authentic BOI style)
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor('#1a5490')
         .text('Transaction Details', 40, currentY);
      
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
           .text(detail.label, 60, currentY);
        
        // Value (properly aligned and styled)
        doc.font(detail.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(detail.bold ? 12 : 11)
           .fillColor(detail.bold ? '#1a5490' : '#000000')
           .text(detail.value, 180, currentY);
        
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