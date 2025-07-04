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
    let attachments: any[] = [];
    
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'boi-logo.png',
        path: logoPath,
        cid: 'boi-logo', // Content ID for inline embedding
        contentDisposition: 'inline' // Prevent showing as separate attachment
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
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Amount:</strong> 
                        <span style="float: right; font-weight: 500;">£${details.amount}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">To Account:</strong> 
                        <span style="float: right; font-weight: 500;">${details.recipientName}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Account Number:</strong> 
                        <span style="float: right; font-weight: 500;">${transferData?.recipientAccountNumber || 'Not available'}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Sort Code:</strong> 
                        <span style="float: right; font-weight: 500;">${transferData?.recipientSortCode || 'Not available'}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Reference:</strong> 
                        <span style="float: right; font-weight: 500;">${details.transactionReference}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Date/Time:</strong> 
                        <span style="float: right; font-weight: 500;">${details.dateTime}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Transaction ID:</strong> 
                        <span style="float: right; font-weight: 500;">${transferData?.id || 'Not available'}</span>
                    </div>
                    <div style="padding: 8px 0;">
                        <strong style="color: #0052cc; font-weight: 600;">Unique Reference:</strong> 
                        <span style="float: right; font-weight: 500;">BOI-${transferData?.id || details.transactionReference}-UK</span>
                    </div>`;
  } else if (isSEPATransfer) {
    transferDetails = `
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Amount:</strong> 
                        <span style="float: right; font-weight: 500;">€${details.amount}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">To Account:</strong> 
                        <span style="float: right; font-weight: 500;">${details.recipientName}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">IBAN:</strong> 
                        <span style="float: right; font-weight: 500;">${transferData?.iban || transferData?.recipientIban || 'Not available'}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">BIC:</strong> 
                        <span style="float: right; font-weight: 500;">${transferData?.bicCode || 'Not available'}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Reference:</strong> 
                        <span style="float: right; font-weight: 500;">${details.transactionReference}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Date/Time:</strong> 
                        <span style="float: right; font-weight: 500;">${details.dateTime}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Transaction ID:</strong> 
                        <span style="float: right; font-weight: 500;">${transferData?.id || 'Not available'}</span>
                    </div>
                    <div style="padding: 8px 0;">
                        <strong style="color: #0052cc; font-weight: 600;">Unique Reference:</strong> 
                        <span style="float: right; font-weight: 500;">BOI-${transferData?.id || details.transactionReference}-SEPA</span>
                    </div>`;
  } else {
    // Default format for other transfers
    transferDetails = `
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Amount:</strong> 
                        <span style="float: right; font-weight: 500;">${details.currency}${details.amount}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">To Account:</strong> 
                        <span style="float: right; font-weight: 500;">${details.recipientName}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Reference:</strong> 
                        <span style="float: right; font-weight: 500;">${details.transactionReference}</span>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf3;">
                        <strong style="color: #0052cc; font-weight: 600;">Date/Time:</strong> 
                        <span style="float: right; font-weight: 500;">${details.dateTime}</span>
                    </div>
                    <div style="padding: 8px 0;">
                        <strong style="color: #0052cc; font-weight: 600;">Transaction ID:</strong> 
                        <span style="float: right; font-weight: 500;">${transferData?.id || 'Not available'}</span>
                    </div>`;
  }
  
  const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transfer Confirmation - Bank of Ireland</title>
    <style>
        @media print {
            body { margin: 0; padding: 20px; background-color: white !important; }
            .email-container { border: none !important; box-shadow: none !important; }
            .no-print { display: none !important; }
        }
        @page {
            margin: 1in;
            size: A4;
        }
    </style>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Arial', sans-serif; background-color: #ffffff; color: #333333;">
    <div class="email-container" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5e5; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header Section with Logo -->
        <div style="background-color: #ffffff; padding: 40px 30px 20px 30px; text-align: center; border-bottom: 2px solid #0052cc;">
            <img src="cid:boi-logo" alt="Bank of Ireland" style="height: 55px; width: auto; display: block; margin: 0 auto;" />
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
            
            <!-- Title -->
            <h1 style="color: #0052cc; margin: 0 0 30px 0; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 0.5px;">
                Transfer Confirmation
            </h1>
            
            <!-- Personal Greeting -->
            <p style="color: #333333; margin: 0 0 25px 0; line-height: 1.6; font-size: 16px;">
                Dear ${details.senderName},
            </p>
            
            <p style="color: #333333; margin: 0 0 35px 0; line-height: 1.6; font-size: 16px;">
                We confirm that your recent transfer has been successfully completed. Please retain this confirmation for your records.
            </p>
            
            <!-- Transfer Details Box -->
            <div style="background-color: #f8f9fb; border: 2px solid #e1e8f0; border-radius: 8px; padding: 30px; margin: 0 0 35px 0;">
                <h2 style="color: #0052cc; margin: 0 0 25px 0; font-size: 18px; font-weight: bold; border-bottom: 1px solid #d1d9e0; padding-bottom: 10px;">
                    Transfer Details
                </h2>
                <div style="color: #333333; font-size: 15px; line-height: 1.8;">
                    ${transferDetails}
                </div>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fff5f5; border: 1px solid #fed7d7; border-radius: 6px; padding: 20px; margin: 0 0 30px 0;">
                <p style="color: #d32f2f; margin: 0; line-height: 1.5; font-size: 15px; font-weight: bold;">
                    ⚠️ If you did not authorise this payment, contact us immediately on 1800 123 456.
                </p>
            </div>
            
            <!-- Automated Message Notice -->
            <p style="color: #666666; margin: 0 0 20px 0; line-height: 1.5; font-size: 13px; font-weight: bold; text-align: center; font-style: italic;">
                This is an automated message from Bank of Ireland. Please do not reply to this email.
            </p>
            
        </div>
        
        <!-- Professional Footer -->
        <div style="background-color: #f4f6f8; padding: 30px; border-top: 1px solid #e5e5e5;">
            <div style="text-align: center; margin-bottom: 20px;">
                <p style="color: #0052cc; margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
                    Thank you for banking with Bank of Ireland.
                </p>
            </div>
            
            <div style="text-align: center; border-top: 1px solid #d1d9e0; padding-top: 20px;">
                <p style="color: #666666; margin: 0 0 5px 0; font-size: 14px;">
                    BOI Customer Service
                </p>
                <p style="color: #0052cc; margin: 0; font-size: 14px; font-weight: 500;">
                    www.bankofireland.com
                </p>
            </div>
        </div>
        
    </div>
    
    <!-- PDF Export Script (for web dashboard) -->
    <script class="no-print">
        function exportToPDF() {
            window.print();
        }
    </script>
    
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