/**
 * Email service for sending transfer confirmations and notifications
 * Uses the same SMTP configuration as the OTC service
 */
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { generateTransferConfirmationPDF } from './pdfService';

export interface TransferConfirmationDetails {
  senderName: string;
  recipientName: string;
  amount: string;
  currency: string;
  transactionReference: string;
  dateTime: string;
  accountInfo: string;
}

/**
 * Create email transporter using the same SMTP configuration as OTC service
 */
const createTransporter = () => {
  try {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
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
 * Send email with PDF attachment with comprehensive logging
 */
export async function sendEmailWithPDF(
  to: string, 
  subject: string, 
  body: string, 
  pdfBuffer: Buffer, 
  pdfFilename: string
): Promise<boolean> {
  console.log('🔵 EMAIL WITH PDF FUNCTION CALLED');
  console.log('📧 SENDING EMAIL WITH PDF ATTACHMENT');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`PDF Filename: ${pdfFilename}`);
  console.log(`PDF Size: ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
  
  // Check PDF size limit (1MB = 1,048,576 bytes)
  if (pdfBuffer.length > 1048576) {
    console.error('❌ PDF too large for email attachment:', pdfBuffer.length, 'bytes');
    return false;
  }
  
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ SMTP transporter not configured');
    console.log('SMTP Config Check:');
    console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
    console.log('- SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
    console.log('- SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
    console.log('- SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
    return false;
  }

  try {
    // Create simple fallback email body
    const simplifiedBody = `
<html>
<body style="font-family: Arial, sans-serif; margin: 20px;">
  <h2 style="color: #0066B2;">Bank of Ireland</h2>
  <p>Dear Valued Customer,</p>
  <p>Your transfer confirmation is attached as a PDF document.</p>
  <p>Thank you for banking with Bank of Ireland.</p>
  <p style="font-size: 12px; color: #666;">BOI Customer Service | www.bankofireland.com</p>
</body>
</html>`;

    const mailOptions = {
      from: {
        name: 'Bank of Ireland',
        address: process.env.SMTP_USER || 'noreply@bankofireland.com'
      },
      to: to,
      subject: subject,
      html: simplifiedBody,
      text: 'Your transfer confirmation is attached as a PDF. Thank you for banking with Bank of Ireland.',
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
          encoding: 'base64'
        }
      ]
    };

    console.log('📧 Attempting to send email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      attachmentSize: pdfBuffer.length,
      attachmentType: 'application/pdf'
    });

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully with result:', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected
    });
    
    return true;
  } catch (error: any) {
    console.error('❌ DETAILED EMAIL SEND ERROR:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    
    // Try sending without attachment as fallback
    console.log('🔄 Attempting fallback email without PDF attachment...');
    try {
      const fallbackOptions = {
        from: {
          name: 'Bank of Ireland',
          address: process.env.SMTP_USER || 'noreply@bankofireland.com'
        },
        to: to,
        subject: 'Transfer Confirmation - Bank of Ireland (PDF Generation Failed)',
        text: 'Your transfer has been processed successfully. Please contact customer service for confirmation details. Thank you for banking with Bank of Ireland.',
        html: `
<html>
<body style="font-family: Arial, sans-serif; margin: 20px;">
  <h2 style="color: #0066B2;">Bank of Ireland</h2>
  <p>Dear Valued Customer,</p>
  <p>Your transfer has been processed successfully.</p>
  <p style="color: #ff6600;">Note: PDF confirmation document could not be attached. Please contact customer service if you need a copy.</p>
  <p>Thank you for banking with Bank of Ireland.</p>
  <p style="font-size: 12px; color: #666;">BOI Customer Service | www.bankofireland.com | 1800 123 456</p>
</body>
</html>`
      };
      
      const fallbackResult = await transporter.sendMail(fallbackOptions);
      console.log('✅ Fallback email sent successfully:', fallbackResult.messageId);
      return true;
    } catch (fallbackError: any) {
      console.error('❌ Fallback email also failed:', fallbackError.message);
      return false;
    }
  }
}

/**
 * Generate transfer confirmation email content with Bank of Ireland formatting
 */
export function generateTransferConfirmationEmail(details: TransferConfirmationDetails): { subject: string; body: string } {
  const subject = "Transfer Confirmation - Bank of Ireland";
  
  const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transfer Confirmation - Bank of Ireland</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; padding: 30px;">
        
        <h2 style="color: #0052cc; margin: 0 0 25px 0; font-size: 24px; font-weight: bold; text-align: center;">Bank of Ireland</h2>
        
        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 18px;">Dear ${details.senderName},</h3>
        
        <p style="color: #333333; margin: 0 0 25px 0; line-height: 1.6; font-size: 15px;">
            Your transfer confirmation is attached to this email as a PDF document.
        </p>
        
        <p style="color: #333333; margin: 0 0 25px 0; line-height: 1.6; font-size: 15px;">
            Please find attached your Bank of Ireland transfer confirmation.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; margin: 25px 0; border-left: 4px solid #0052cc;">
            <p style="color: #333333; margin: 0; font-size: 14px; font-weight: bold;">
                Transfer Reference: ${details.transactionReference}
            </p>
            <p style="color: #333333; margin: 5px 0 0 0; font-size: 14px;">
                Amount: ${details.currency}${details.amount} to ${details.recipientName}
            </p>
        </div>
        
        <p style="color: #666666; margin: 25px 0 15px 0; font-size: 12px;">
            Thank you for banking with Bank of Ireland.
        </p>
        
        <p style="color: #666666; margin: 0; font-size: 12px;">
            BOI Customer Service | www.bankofireland.com
        </p>
        
    </div>
</body>
</html>`;
  
  return { subject, body };
}

/**
 * Send transfer confirmation email to user with PDF attachment
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
    // Generate email content (simple HTML without logo)
    const { subject, body } = generateTransferConfirmationEmail(details);
    
    // Generate PDF with BOI logo and transfer details
    const pdfBuffer = await generateTransferConfirmationPDF(details, transferData);
    
    // Send email with PDF attachment
    const success = await sendEmailWithPDF(userEmail, subject, body, pdfBuffer, `TransferConfirmation-${transferData?.id || details.transactionReference}.pdf`);
    
    if (success) {
      console.log(`✅ Transfer confirmation email with PDF sent to ${userEmail} for transaction ${details.transactionReference}`);
    } else {
      console.error(`❌ Failed to send transfer confirmation email to ${userEmail}`);
    }
    
    return success;
  } catch (error) {
    console.error('🔴 ERROR in sendTransferConfirmation:', error);
    return false;
  }
}