/**
 * Test SendGrid integration via Replit connector
 */

import sgMail from '@sendgrid/mail';

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Replit connector environment not available');
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

  if (!connectionSettings || !connectionSettings.settings.api_key || !connectionSettings.settings.from_email) {
    throw new Error('SendGrid not connected or missing credentials');
  }
  
  return {
    apiKey: connectionSettings.settings.api_key, 
    email: connectionSettings.settings.from_email
  };
}

async function sendTestEmail() {
  console.log('📧 SendGrid Integration Test\n');
  
  try {
    const credentials = await getCredentials();
    console.log('✅ SendGrid credentials retrieved successfully');
    console.log(`   From email: ${credentials.email}`);
    
    sgMail.setApiKey(credentials.apiKey);
    
    const msg = {
      to: 'tjsservices81@gmail.com',
      from: {
        name: 'Bank of Ireland',
        email: credentials.email
      },
      subject: 'Test Email',
      text: 'SendGrid works! This is a test email from your Bank of Ireland app.',
      html: '<strong>SendGrid works!</strong><p>This is a test email from your Bank of Ireland app.</p>'
    };
    
    console.log('\n📤 Sending test email...');
    console.log(`   To: ${msg.to}`);
    console.log(`   Subject: ${msg.subject}`);
    
    await sgMail.send(msg);
    console.log('\n✅ Email sent successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.body) {
      console.error('Response:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

sendTestEmail();
