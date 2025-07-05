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
 * Send email with PDF attachment
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
  
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('SMTP not configured. Email with PDF would be sent to:', { to, subject, pdfFilename });
    return false;
  }

  try {
    const mailOptions = {
      from: {
        name: 'Bank of Ireland',
        address: 'bankofireland2007@gmail.com'
      },
      to: to,
      subject: subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ],
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email with PDF attachment sent successfully to: ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email with PDF:', error);
    return false;
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
 * Generate bank statement email content with Bank of Ireland formatting
 */
export function generateBankStatementEmail(
  customerName: string, 
  accountName: string, 
  statementPeriod: string
): { subject: string; body: string } {
  const subject = "Your Bank of Ireland Statement";
  
  const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Bank of Ireland Statement</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; padding: 30px;">
        
        <h2 style="color: #0052cc; margin: 0 0 25px 0; font-size: 24px; font-weight: bold; text-align: center;">Bank of Ireland</h2>
        
        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 18px;">Dear ${customerName},</h3>
        
        <p style="color: #333333; margin: 0 0 25px 0; line-height: 1.6; font-size: 15px;">
            Your account statement is attached to this email as a PDF document.
        </p>
        
        <p style="color: #333333; margin: 0 0 25px 0; line-height: 1.6; font-size: 15px;">
            Please find attached your Bank of Ireland statement for the requested period.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; margin: 25px 0; border-left: 4px solid #0052cc;">
            <p style="color: #333333; margin: 0; font-size: 14px; font-weight: bold;">
                Account: ${accountName}
            </p>
            <p style="color: #333333; margin: 5px 0 0 0; font-size: 14px;">
                Statement Period: ${statementPeriod}
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
 * Send bank statement email to user with PDF attachment
 */
export async function sendBankStatement(
  userEmail: string,
  customerName: string,
  accountName: string,
  statementPeriod: string,
  pdfBuffer: Buffer
): Promise<boolean> {
  console.log('🔵 BANK STATEMENT EMAIL TRIGGERED - sendBankStatement()');
  console.log('Sending to:', userEmail);
  console.log('Account:', accountName);
  console.log('Period:', statementPeriod);
  
  try {
    // Generate email content
    const { subject, body } = generateBankStatementEmail(customerName, accountName, statementPeriod);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const filename = `BankStatement-${accountName.replace(/\s+/g, '')}-${timestamp}.pdf`;
    
    // Send email with PDF attachment
    const success = await sendEmailWithPDF(userEmail, subject, body, pdfBuffer, filename);
    
    if (success) {
      console.log(`✅ Bank statement email with PDF sent to ${userEmail} for ${accountName}`);
    } else {
      console.error(`❌ Failed to send bank statement email to ${userEmail}`);
    }
    
    return success;
  } catch (error) {
    console.error('🔴 ERROR in sendBankStatement:', error);
    return false;
  }
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
    
    // Generate PDF with BOI logo and transfer details using new template-based system
    const pdfBuffer = await generateTransferConfirmationPDF(
      details.senderName,
      details.recipientName,
      details.amount,
      details.currency,
      details.transactionReference,
      details.accountInfo,
      transferData
    );
    
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