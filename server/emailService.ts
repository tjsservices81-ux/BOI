/**
 * Email service for sending transfer confirmations and notifications
 */

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

/**
 * Placeholder email function - will be replaced with actual email service
 * Currently logs emails to console for development
 */
export function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log('📧 EMAIL NOTIFICATION SENT');
  console.log('='.repeat(50));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:`);
  console.log(body);
  console.log('='.repeat(50));
  
  // Simulate email sending delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 100);
  });
}

/**
 * Generate transfer confirmation email content
 */
export function generateTransferConfirmationEmail(details: TransferConfirmationDetails): { subject: string; body: string } {
  const subject = `Transfer Confirmation - ${details.transactionReference}`;
  
  const body = `
Dear ${details.senderName},

Your transfer has been successfully processed. Here are the details:

TRANSFER DETAILS
================
Recipient: ${details.recipientName}
Amount: ${details.currency} ${details.amount}
Date & Time: ${details.dateTime}
Transaction Reference: ${details.transactionReference}
${details.accountInfo ? `Account: ${details.accountInfo}` : ''}

Your funds have been securely transferred and should reach the recipient shortly.

If you have any questions about this transfer, please contact our customer service team with your transaction reference number.

Thank you for banking with us.

Best regards,
BOI Banking Team

---
This is an automated message. Please do not reply to this email.
Transaction ID: ${details.transactionReference}
Sent: ${new Date().toISOString()}
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
    console.error('Error sending transfer confirmation email:', error);
    return false;
  }
}