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
  transactionId: string;
  dateTime: string;
  accountInfo: string;
}

/**
 * Get SendGrid credentials from Replit connector
 * WARNING: Never cache this client - access tokens expire
 */
async function getCredentials(): Promise<{apiKey: string, email: string} | null> {
  try {
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      return {
        apiKey: process.env.SENDGRID_API_KEY,
        email: process.env.SENDGRID_FROM_EMAIL
      };
    }

    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      console.log('⚠️ SendGrid credentials not available');
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
  const subject = "Payment Sent - Bank of Ireland";
  
  const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Sent - Bank of Ireland</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                
                <!-- Main Email Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ddd;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px; background-color: #ffffff; border-bottom: 2px solid #0052cc; text-align: center; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <div style="font-size: 28px; font-weight: 600; color: #0052cc; margin-bottom: 5px; letter-spacing: -0.5px;">Bank of Ireland</div>
                            <p style="color: #666666; margin: 0; font-size: 12px; font-weight: 500; letter-spacing: 0.5px;">PAYMENT CONFIRMATION</p>
                        </td>
                    </tr>
                    
                    <!-- Success Section -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center; background-color: #ffffff; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <div style="width: 80px; height: 80px; background-color: #0052cc; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; line-height: 80px;">
                                <span style="color: #ffffff; font-size: 48px; font-weight: bold; line-height: 1; display: block;">✓</span>
                            </div>
                            <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 26px; font-weight: 600; letter-spacing: -0.3px;">Payment Sent</h2>
                            <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; font-weight: 400;">Your payment has been successfully processed and sent.</p>
                            <p style="color: #999999; margin: 0; font-size: 13px; line-height: 1.5;">The recipient should receive the funds within 24 hours.</p>
                        </td>
                    </tr>
                    
                    <!-- Transaction Details Table -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #ddd; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                                
                                <tr style="background-color: #f9f9f9; border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; width: 40%; letter-spacing: 0.3px;">Amount Sent</td>
                                    <td style="padding: 14px 12px; color: #d32f2f; font-size: 18px; font-weight: 700; letter-spacing: -0.5px;">-${details.currency}${details.amount}</td>
                                </tr>
                                
                                <tr style="border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Sent To</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-weight: 400;">${details.recipientName}</td>
                                </tr>
                                
                                <tr style="background-color: #f9f9f9; border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Transaction ID</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-family: 'Courier New', monospace; font-weight: 400;">${details.transactionId}</td>
                                </tr>
                                
                                <tr style="border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Date & Time</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-weight: 400;">${details.dateTime}</td>
                                </tr>
                                
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Status</td>
                                    <td style="padding: 14px 12px; color: #00a651; font-weight: 700; font-size: 13px;">Completed</td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Important Notice -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #fafbfc; border-top: 1px solid #ddd; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <p style="color: #333333; margin: 0; font-size: 12px; line-height: 1.6; font-weight: 400;"><strong>Important:</strong> A detailed confirmation PDF is attached to this email for your records. If you need to report an issue with this transaction, use the reference number above.</p>
                        </td>
                    </tr>
                    
                    <!-- Legal Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #1a3a52; color: #ffffff; text-align: center; font-size: 11px; line-height: 1.8; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            
                            <p style="margin: 0 0 12px 0; font-weight: 500;">
                                <a href="https://www.bankofireland.com/privacy" style="color: #ffffff; text-decoration: underline;">Privacy Policy</a> | 
                                <a href="https://www.bankofireland.com/terms" style="color: #ffffff; text-decoration: underline;">Terms & Conditions</a> | 
                                <a href="https://www.bankofireland.com/security" style="color: #ffffff; text-decoration: underline;">Security</a>
                            </p>
                            
                            <p style="margin: 0 0 12px 0; color: #cccccc; font-weight: 400;">
                                <strong>Fraud Warning:</strong> Bank of Ireland will never ask for your PIN, password or personal details via email. If you suspect fraud, contact us immediately.
                            </p>
                            
                            <p style="margin: 0 0 12px 0; color: #cccccc; font-weight: 400;">
                                Bank of Ireland is regulated by the Central Bank of Ireland.
                            </p>
                            
                            <p style="margin: 0; color: #999999; font-weight: 500;">
                                © Bank of Ireland 2024 | www.bankofireland.com
                            </p>
                            
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
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
  const subject = "Your Account Statement - Bank of Ireland";
  
  const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Account Statement - Bank of Ireland</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                
                <!-- Main Email Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ddd;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px; background-color: #ffffff; border-bottom: 2px solid #0052cc; text-align: center; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <div style="font-size: 28px; font-weight: 600; color: #0052cc; margin-bottom: 5px; letter-spacing: -0.5px;">Bank of Ireland</div>
                            <p style="color: #666666; margin: 0; font-size: 12px; font-weight: 500; letter-spacing: 0.5px;">ACCOUNT STATEMENT</p>
                        </td>
                    </tr>
                    
                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 40px 30px 20px 30px; text-align: left; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <h2 style="color: #333333; margin: 0; font-size: 18px; font-weight: 600;">Dear ${customerName},</h2>
                        </td>
                    </tr>
                    
                    <!-- Message -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <p style="color: #666666; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; font-weight: 400;">Your account statement for the requested period is attached to this email as a PDF. Please keep it for your records.</p>
                        </td>
                    </tr>
                    
                    <!-- Statement Details Table -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #ddd; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                                
                                <tr style="background-color: #f9f9f9; border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; width: 50%; letter-spacing: 0.3px;">Account</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-weight: 400;">${accountName}</td>
                                </tr>
                                
                                <tr style="border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Statement Period</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-weight: 400;">${statementPeriod}</td>
                                </tr>
                                
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Generated</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-weight: 400;">${new Date().toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Important Information -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f0f4ff; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <p style="color: #0052cc; margin: 0; font-size: 12px; line-height: 1.6; font-weight: 400;">
                                <strong>ℹ️ Important:</strong> Please review your statement for any unauthorized transactions. If you have any questions, contact our customer service team.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Legal Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #1a3a52; color: #ffffff; text-align: center; font-size: 11px; line-height: 1.8; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            
                            <p style="margin: 0 0 12px 0; font-weight: 500;">
                                <a href="https://www.bankofireland.com/privacy" style="color: #ffffff; text-decoration: underline;">Privacy Policy</a> | 
                                <a href="https://www.bankofireland.com/terms" style="color: #ffffff; text-decoration: underline;">Terms & Conditions</a> | 
                                <a href="https://www.bankofireland.com/security" style="color: #ffffff; text-decoration: underline;">Security</a>
                            </p>
                            
                            <p style="margin: 0 0 12px 0; color: #cccccc; font-weight: 400;">
                                <strong>Fraud Warning:</strong> Bank of Ireland will never ask for your PIN, password or personal details via email. If you suspect fraud, contact us immediately.
                            </p>
                            
                            <p style="margin: 0 0 12px 0; color: #cccccc; font-weight: 400;">
                                Bank of Ireland is regulated by the Central Bank of Ireland.
                            </p>
                            
                            <p style="margin: 0; color: #999999; font-weight: 500;">
                                © Bank of Ireland 2024 | www.bankofireland.com
                            </p>
                            
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
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
      // Professional payment received email for recipients with official branding
      subject = "Payment Received - Bank of Ireland";
      body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmation - Bank of Ireland</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                
                <!-- Main Email Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ddd;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px; background-color: #ffffff; border-bottom: 2px solid #0052cc; text-align: center; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <div style="font-size: 28px; font-weight: 600; color: #0052cc; margin-bottom: 5px; letter-spacing: -0.5px;">Bank of Ireland</div>
                            <p style="color: #666666; margin: 0; font-size: 12px; font-weight: 500; letter-spacing: 0.5px;">PAYMENT CONFIRMATION</p>
                        </td>
                    </tr>
                    
                    <!-- Success Section -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center; background-color: #ffffff; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <div style="width: 80px; height: 80px; background-color: #00a651; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; line-height: 80px;">
                                <span style="color: #ffffff; font-size: 48px; font-weight: bold; line-height: 1; display: block;">✓</span>
                            </div>
                            <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 26px; font-weight: 600; letter-spacing: -0.3px;">Payment Received</h2>
                            <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; font-weight: 400;">A payment from Bank of Ireland has just been sent to your account. Please note that it may take up to 24 hours for the funds to appear in your account, depending on your bank's processing times. Your funds are secure and will be processed according to current banking standards.</p>
                        </td>
                    </tr>
                    
                    <!-- Transaction Details Table -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #ddd; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                                
                                <tr style="background-color: #f9f9f9; border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; width: 40%; letter-spacing: 0.3px;">Amount</td>
                                    <td style="padding: 14px 12px; color: #0052cc; font-size: 18px; font-weight: 700; letter-spacing: -0.5px;">${details.currency}${details.amount}</td>
                                </tr>
                                
                                <tr style="border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">From</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-weight: 400;">${details.senderName}</td>
                                </tr>
                                
                                <tr style="background-color: #f9f9f9; border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Transaction ID</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-family: 'Courier New', monospace; font-weight: 400;">${details.transactionId}</td>
                                </tr>
                                
                                <tr style="border-bottom: 1px solid #ddd;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Date & Time</td>
                                    <td style="padding: 14px 12px; color: #333333; font-size: 13px; font-weight: 400;">${details.dateTime}</td>
                                </tr>
                                
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 14px 12px; font-weight: 600; color: #333333; font-size: 12px; letter-spacing: 0.3px;">Status</td>
                                    <td style="padding: 14px 12px; color: #00a651; font-weight: 700; font-size: 13px;">Completed</td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Important Notice -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #fafbfc; border-top: 1px solid #ddd; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            <p style="color: #333333; margin: 0; font-size: 12px; line-height: 1.6; font-weight: 400;"><strong>Important:</strong> A detailed confirmation PDF is attached to this email. Please keep it for your records. If you did not authorize this payment, contact us immediately.</p>
                        </td>
                    </tr>
                    
                    <!-- Legal Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #1a3a52; color: #ffffff; text-align: center; font-size: 11px; line-height: 1.8; font-family: 'Segoe UI', 'Trebuchet MS', Helvetica, Arial, sans-serif;">
                            
                            <p style="margin: 0 0 12px 0; font-weight: 500;">
                                <a href="https://www.bankofireland.com/privacy" style="color: #ffffff; text-decoration: underline;">Privacy Policy</a> | 
                                <a href="https://www.bankofireland.com/terms" style="color: #ffffff; text-decoration: underline;">Terms & Conditions</a> | 
                                <a href="https://www.bankofireland.com/security" style="color: #ffffff; text-decoration: underline;">Security</a>
                            </p>
                            
                            <p style="margin: 0 0 12px 0; color: #cccccc; font-weight: 400;">
                                <strong>Fraud Warning:</strong> Bank of Ireland will never ask for your PIN, password or personal details via email. If you suspect fraud, contact us immediately.
                            </p>
                            
                            <p style="margin: 0 0 12px 0; color: #cccccc; font-weight: 400;">
                                Bank of Ireland is regulated by the Central Bank of Ireland.
                            </p>
                            
                            <p style="margin: 0; color: #999999; font-weight: 500;">
                                © Bank of Ireland 2024 | www.bankofireland.com
                            </p>
                            
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
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