/**
 * Email service for sending transfer confirmations and notifications
 * Uses SendGrid integration via Replit connector
 */
import sgMail from '@sendgrid/mail';
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
 * Get SendGrid credentials from Replit connector
 * WARNING: Never cache this client - access tokens expire
 */
async function getCredentials(): Promise<{apiKey: string, email: string} | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      console.log('⚠️ Replit connector not available');
      return null;
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
      console.log('⚠️ SendGrid not connected or missing credentials');
      return null;
    }
    
    return {
      apiKey: connectionSettings.settings.api_key, 
      email: connectionSettings.settings.from_email
    };
  } catch (error) {
    console.error('Failed to get SendGrid credentials:', error);
    return null;
  }
}

/**
 * Get a fresh SendGrid client (never cached due to token expiration)
 */
async function getUncachableSendGridClient() {
  const credentials = await getCredentials();
  if (!credentials) return null;
  
  sgMail.setApiKey(credentials.apiKey);
  return {
    client: sgMail,
    fromEmail: credentials.email
  };
}

/**
 * Send email with PDF attachment via SendGrid
 */
export async function sendEmailWithPDF(
  to: string, 
  subject: string, 
  body: string, 
  pdfBuffer: Buffer, 
  pdfFilename: string
): Promise<boolean> {
  console.log('🔵 EMAIL WITH PDF FUNCTION CALLED');
  console.log('📧 SENDING EMAIL WITH PDF ATTACHMENT VIA SENDGRID');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`PDF Filename: ${pdfFilename}`);
  
  const sendgrid = await getUncachableSendGridClient();
  
  if (!sendgrid) {
    console.log('⚠️ SendGrid not configured. Email with PDF would be sent to:', { to, subject, pdfFilename });
    return false;
  }

  try {
    const msg = {
      to: to,
      from: {
        name: 'Bank of Ireland',
        email: sendgrid.fromEmail
      },
      subject: subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString('base64'),
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    console.log('📤 Attempting to send email via SendGrid...');
    console.log('From:', sendgrid.fromEmail);
    
    await sendgrid.client.send(msg);
    console.log(`✅ Email with PDF attachment sent successfully to: ${to}`);
    return true;
  } catch (error) {
    console.error('❌ FAILED to send email with PDF:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      response: (error as any)?.response?.body
    });
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
 * Check if emails are enabled for a user (from localStorage/user settings)
 */
function areEmailsEnabled(customerNumber?: string): boolean {
  // Since this is server-side, we'll check via a query parameter or header
  // For now, return true to maintain compatibility
  // Frontend will need to pass this preference
  return true;
}

/**
 * Send bank statement email to user with PDF attachment
 */
export async function sendBankStatement(
  userEmail: string,
  customerName: string,
  accountName: string,
  statementPeriod: string,
  pdfBuffer: Buffer,
  emailsEnabled: boolean = true
): Promise<boolean> {
  console.log('🔵 BANK STATEMENT EMAIL TRIGGERED - sendBankStatement()');
  console.log('Sending to:', userEmail);
  console.log('Account:', accountName);
  console.log('Period:', statementPeriod);
  console.log('Emails enabled:', emailsEnabled);
  
  // Check if emails are disabled
  if (!emailsEnabled) {
    console.log('⚠️ Emails are disabled for this user. Skipping email send.');
    return false;
  }
  
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
  transferData?: any,
  userCurrency?: 'EUR' | 'GBP',
  emailsEnabled: boolean = true,
  isRecipient: boolean = false
): Promise<boolean> {
  console.log('🔵 TRANSFER CONFIRMATION EMAIL TRIGGERED - sendTransferConfirmation()');
  console.log('Sending to:', userEmail);
  console.log('Transfer:', details.amount, details.recipientName, details.transactionReference);
  console.log('Transfer data:', transferData);
  console.log('User currency:', userCurrency);
  console.log('Emails enabled:', emailsEnabled);
  console.log('Is recipient email:', isRecipient);
  
  // Check if emails are disabled
  if (!emailsEnabled) {
    console.log('⚠️ Emails are disabled for this user. Skipping email send.');
    return false;
  }
  
  try {
    let subject: string;
    let body: string;

    if (isRecipient) {
      // Professional payment received email for recipients
      subject = "Payment Received - Bank of Ireland";
      body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Received - Bank of Ireland</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0;">
        
        <!-- Header with Bank of Ireland branding -->
        <div style="background: linear-gradient(135deg, #0052cc 0%, #003d99 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Bank of Ireland</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Mobile Banking</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 30px;">
            
            <!-- Success message -->
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background-color: #10b981; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #ffffff; font-size: 36px; font-weight: bold;">✓</span>
                </div>
                <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Payment Received</h2>
                <p style="color: #666666; margin: 0; font-size: 16px;">Your payment has been successfully processed</p>
            </div>
            
            <!-- Payment details card -->
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #0052cc;">
                
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
                    <p style="color: #999999; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">Amount</p>
                    <p style="color: #0052cc; margin: 0; font-size: 28px; font-weight: bold;">${details.currency}${details.amount}</p>
                </div>
                
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
                    <p style="color: #999999; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">From</p>
                    <p style="color: #333333; margin: 0; font-size: 16px; font-weight: 500;">${details.senderName}</p>
                </div>
                
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
                    <p style="color: #999999; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">Reference</p>
                    <p style="color: #333333; margin: 0; font-size: 14px; font-family: 'Courier New', monospace;">${details.transactionReference}</p>
                </div>
                
                <div>
                    <p style="color: #999999; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">Date & Time</p>
                    <p style="color: #333333; margin: 0; font-size: 14px;">${details.dateTime}</p>
                </div>
                
            </div>
            
            <!-- Next steps -->
            <div style="background-color: #f0f4ff; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <p style="color: #0052cc; margin: 0; font-size: 13px; line-height: 1.6;">
                    <strong>What's next?</strong><br>
                    The funds have been added to your account. A detailed confirmation PDF is attached to this email for your records.
                </p>
            </div>
            
            <!-- Supporting text -->
            <p style="color: #666666; margin: 0 0 20px 0; line-height: 1.6; font-size: 14px;">
                If you have any questions about this payment or need assistance, please contact our customer service team at your earliest convenience.
            </p>
            
            <!-- Footer -->
            <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                <p style="color: #999999; margin: 0 0 10px 0; font-size: 12px;">
                    Bank of Ireland • Customer Service: 1800 123 456
                </p>
                <p style="color: #999999; margin: 0; font-size: 11px;">
                    This is a secure automated message. Please do not reply to this email.
                </p>
            </div>
            
        </div>
        
    </div>
</body>
</html>`;
    } else {
      // Full email content for the sender
      const emailContent = generateTransferConfirmationEmail(details);
      subject = emailContent.subject;
      body = emailContent.body;
    }
    
    // Generate PDF with BOI logo and transfer details using new template-based system
    const pdfBuffer = await generateTransferConfirmationPDF(
      details.senderName,
      details.recipientName,
      details.amount,
      details.currency,
      details.transactionReference,
      details.accountInfo,
      transferData,
      userCurrency
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