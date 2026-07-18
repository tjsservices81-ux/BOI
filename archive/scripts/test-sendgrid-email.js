/**
 * SendGrid SMTP Test Script
 * Tests email sending via SendGrid using nodemailer
 */

const nodemailer = require('nodemailer');

async function sendTestEmail() {
  console.log('📧 SendGrid SMTP Test\n');
  
  // Check required environment variables
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('\nPlease set these in your Replit Secrets:');
    console.log('  SMTP_HOST = smtp.sendgrid.net');
    console.log('  SMTP_PORT = 587');
    console.log('  SMTP_USER = apikey');
    console.log('  SMTP_PASS = your_sendgrid_api_key');
    console.log('  FROM_EMAIL = your_verified_sender@domain.com');
    process.exit(1);
  }
  
  console.log('✅ Environment variables found');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`   FROM_EMAIL: ${process.env.FROM_EMAIL}`);
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  // Test email options
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: 'tjsservices81@gmail.com',
    subject: 'Test Email',
    text: 'SendGrid works'
  };
  
  console.log('\n📤 Sending test email...');
  console.log(`   To: ${mailOptions.to}`);
  console.log(`   Subject: ${mailOptions.subject}`);
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('\n✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
  } catch (error) {
    console.error('\n❌ Failed to send email:');
    console.error(`   Error: ${error.message}`);
    if (error.code) console.error(`   Code: ${error.code}`);
    if (error.response) console.error(`   Response: ${error.response}`);
  }
}

sendTestEmail();
