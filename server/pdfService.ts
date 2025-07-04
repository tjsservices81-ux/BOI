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
 */
export async function generateTransferConfirmationPDF(
  details: TransferPDFData,
  transferData?: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Add Bank of Ireland logo at the top
      const logoPath = path.join(process.cwd(), 'attached_assets', 'IMG_1948_1751632845410.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 200, align: 'center' });
        doc.moveDown(3);
      } else {
        // Fallback text header if logo not found
        doc.fontSize(24).font('Helvetica-Bold').text('Bank of Ireland', 50, 50, { align: 'center' });
        doc.moveDown(2);
      }

      // Main heading
      doc.fontSize(20).font('Helvetica-Bold').text('Transfer Confirmation', { align: 'center' });
      doc.moveDown(2);

      // Transaction Details section
      doc.fontSize(16).font('Helvetica-Bold').text('Transaction Details', { underline: true });
      doc.moveDown(1);

      // Determine transfer type and format details accordingly
      const isUKTransfer = transferData?.paymentMethod === 'UK Transfer' || 
                         transferData?.recipientSortCode || 
                         transferData?.recipientAccountNumber;
      
      const isSEPATransfer = transferData?.paymentMethod === 'SEPA Transfer' || 
                            transferData?.iban || 
                            transferData?.bicCode ||
                            details.currency === '€';

      doc.fontSize(12).font('Helvetica');
      
      // Format transfer details based on type
      if (isUKTransfer) {
        doc.text(`• Amount: ${details.currency}${details.amount}`);
        doc.text(`• To Account: ${details.recipientName}`);
        doc.text(`• Account Number: ${transferData?.recipientAccountNumber || 'Not available'}`);
        doc.text(`• Sort Code: ${transferData?.recipientSortCode || 'Not available'}`);
        doc.text(`• Reference: ${details.transactionReference}`);
        doc.text(`• Date/Time: ${details.dateTime}`);
        doc.text(`• Transaction ID: ${transferData?.id || 'Not available'}`);
        doc.text(`• Unique Reference: BOI-${transferData?.id || details.transactionReference}-UK`);
      } else if (isSEPATransfer) {
        doc.text(`• Amount: ${details.currency}${details.amount}`);
        doc.text(`• To Account: ${details.recipientName}`);
        doc.text(`• IBAN: ${transferData?.iban || transferData?.recipientIban || 'Not available'}`);
        doc.text(`• BIC: ${transferData?.bicCode || 'Not available'}`);
        doc.text(`• Reference: ${details.transactionReference}`);
        doc.text(`• Date/Time: ${details.dateTime}`);
        doc.text(`• Transaction ID: ${transferData?.id || 'Not available'}`);
        doc.text(`• Unique Reference: BOI-${transferData?.id || details.transactionReference}-SEPA`);
      } else {
        // Internal transfer or default
        doc.text(`• Amount: ${details.currency}${details.amount}`);
        doc.text(`• To Account: ${details.recipientName}`);
        doc.text(`• Reference: ${details.transactionReference}`);
        doc.text(`• Date/Time: ${details.dateTime}`);
        doc.text(`• Transaction ID: ${transferData?.id || 'Not available'}`);
      }

      doc.moveDown(3);

      // Footer section
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('If you did not authorise this payment, please contact 1800 123 456 immediately.', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.text('This is an automated message from Bank of Ireland. Please do not reply.', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.text('Thank you for banking with Bank of Ireland.', { align: 'center' });
      doc.moveDown(1);
      
      doc.fontSize(9).font('Helvetica');
      doc.text('BOI Customer Service | www.bankofireland.com', { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}