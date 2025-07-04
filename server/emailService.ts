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
    // Prepare Bank of Ireland logo attachment - use the new uploaded authentic BOI logo
    const logoPath = path.join(process.cwd(), 'attached_assets', 'IMG_1948_1751632845410.png');
    let attachments = [];
    
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'boi-logo.png',
        path: logoPath,
        cid: 'boi-logo' // Content ID for inline embedding
      });
    }

    const mailOptions = {
      from: {
        name: 'Bank of Ireland',
        address: 'bankofireland2007@gmail.com'
      },
      to: to,
      subject: subject,
      html: body, // Use the properly formatted HTML from generateTransferConfirmationEmail
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      attachments: attachments,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
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
  const subject = "Transfer Confirmation - Bank of Ireland";
  
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
                    <div style="margin-bottom: 8px;">• Amount: £${details.amount}</div>
                    <div style="margin-bottom: 8px;">• To Account: ${details.recipientName}</div>
                    <div style="margin-bottom: 8px;">• Account Number: ${transferData?.recipientAccountNumber || 'Not available'}</div>
                    <div style="margin-bottom: 8px;">• Sort Code: ${transferData?.recipientSortCode || 'Not available'}</div>
                    <div style="margin-bottom: 8px;">• Reference: ${details.transactionReference}</div>
                    <div style="margin-bottom: 8px;">• Date/Time: ${details.dateTime}</div>
                    <div style="margin-bottom: 8px;">• Transaction ID: ${transferData?.id || 'Not available'}</div>
                    <div style="margin-bottom: 0;">• Unique Reference: BOI-${transferData?.id || details.transactionReference}-UK</div>`;
  } else if (isSEPATransfer) {
    transferDetails = `
                    <div style="margin-bottom: 8px;">• Amount: €${details.amount}</div>
                    <div style="margin-bottom: 8px;">• To Account: ${details.recipientName}</div>
                    <div style="margin-bottom: 8px;">• IBAN: ${transferData?.iban || transferData?.recipientIban || 'Not available'}</div>
                    <div style="margin-bottom: 8px;">• BIC: ${transferData?.bicCode || 'Not available'}</div>
                    <div style="margin-bottom: 8px;">• Reference: ${details.transactionReference}</div>
                    <div style="margin-bottom: 8px;">• Date/Time: ${details.dateTime}</div>
                    <div style="margin-bottom: 8px;">• Transaction ID: ${transferData?.id || 'Not available'}</div>
                    <div style="margin-bottom: 0;">• Unique Reference: BOI-${transferData?.id || details.transactionReference}-SEPA</div>`;
  } else {
    // Default format for other transfers
    transferDetails = `
                    <div style="margin-bottom: 8px;">• Amount: ${details.currency}${details.amount}</div>
                    <div style="margin-bottom: 8px;">• To Account: ${details.recipientName}</div>
                    <div style="margin-bottom: 8px;">• Reference: ${details.transactionReference}</div>
                    <div style="margin-bottom: 8px;">• Date/Time: ${details.dateTime}</div>
                    <div style="margin-bottom: 0;">• Transaction ID: ${transferData?.id || 'Not available'}</div>`;
  }
  
  const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transfer Confirmation - Bank of Ireland</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0;">
        
        <!-- Header with authentic BOI Logo -->
        <div style="background-color: #ffffff; padding: 30px 25px 20px 25px; text-align: center;">
            <img src="cid:boi-logo" alt="Bank of Ireland" style="height: 50px; width: auto; display: block; margin: 0 auto;">
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px 25px;">
            <h2 style="color: #333333; margin: 0 0 25px 0; font-size: 20px; font-weight: bold;">Transfer Confirmation</h2>
            
            <p style="color: #333333; margin: 0 0 20px 0; line-height: 1.6; font-size: 15px;">
                Dear ${details.senderName},
            </p>
            
            <p style="color: #333333; margin: 0 0 30px 0; line-height: 1.6; font-size: 15px;">
                We confirm that your recent transfer has been successfully completed.
            </p>
            
            <!-- Transfer Details -->
            <div style="background-color: #f8f9fa; border-left: 4px solid #0052cc; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #0052cc; margin: 0 0 20px 0; font-size: 16px; font-weight: bold;">Transfer Details</h3>
                <div style="color: #333333; font-size: 14px; line-height: 1.4;">
                    ${transferDetails}
                </div>
            </div>
            
            <p style="color: #555555; margin: 0 0 25px 0; line-height: 1.5; font-size: 13px; font-weight: bold;">
                This is an automated message from Bank of Ireland. Please do not reply to this email.
            </p>
            
            <p style="color: #d32f2f; margin: 0 0 0 0; line-height: 1.5; font-size: 14px; font-weight: bold;">
                If you did not authorise this payment, contact 1800 123 456 immediately.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 25px; border-top: 1px solid #e0e0e0; text-align: left;">
            <p style="color: #666666; margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;">
                Thank you for banking with Bank of Ireland.
            </p>
            <p style="color: #666666; margin: 0 0 8px 0; font-size: 14px;">
                BOI Customer Service
            </p>
            <p style="color: #0052cc; margin: 0; font-size: 14px;">
                www.bankofireland.com
            </p>
        </div>
        
    </div>
</body>
</html>`;
  
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