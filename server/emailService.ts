/**
 * Email service for sending transfer confirmations and notifications
 * Uses the same SMTP configuration as the OTC service
 */
import nodemailer from 'nodemailer';

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
    const mailOptions = {
      from: 'bankofireland2007@gmail.com', // Use the same sender as OTC service
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #126987; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">Bank of Ireland</h2>
            <p style="margin: 5px 0 0 0; font-size: 16px;">${subject}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">
            ${body.replace(/\n/g, '<br>')}
          </div>
        </div>
      `,
      text: body
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
 * Generate transfer confirmation email content in the format requested by user
 */
export function generateTransferConfirmationEmail(details: TransferConfirmationDetails): { subject: string; body: string } {
  const subject = "Transfer Confirmation";
  
  const body = `
Hello ${details.senderName},

Your transfer of ${details.currency}${details.amount} to ${details.recipientName} has been completed successfully.

Reference: ${details.transactionReference}
Date: ${details.dateTime}

Thank you for using our service.
  `;
  
  return { subject, body };
}

/**
 * Send transfer confirmation email to user
 */
export async function sendTransferConfirmation(
  userEmail: string, 
  details: TransferConfirmationDetails
): Promise<boolean> {
  console.log('🔵 TRANSFER CONFIRMATION EMAIL TRIGGERED - sendTransferConfirmation()');
  console.log('Sending to:', userEmail);
  console.log('Transfer:', details.amount, details.recipientName, details.transactionReference);
  
  try {
    const { subject, body } = generateTransferConfirmationEmail(details);
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