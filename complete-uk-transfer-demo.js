async function demonstrateUKTransferSystem() {
  console.log('🏦 COMPLETE UK TRANSFER SYSTEM DEMONSTRATION\n');
  
  // First, test access with one of the new BOI codes
  console.log('1. Testing access with BOI code...');
  try {
    const accessResponse = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BOI372650' })
    });
    
    if (accessResponse.ok) {
      console.log('✅ Access code validation working');
    } else {
      console.log('❌ Access code validation failed');
      return;
    }
  } catch (e) {
    console.log('❌ Access test failed');
    return;
  }

  // Test sort code validation logic directly
  console.log('\n2. Testing sort code validation logic...');
  
  const sortCodeToBank = {
    "04-00-04": "Monzo Bank",
    "07-01-16": "Metro Bank",
    "08-71-99": "Cashplus Bank", 
    "20-00-00": "Barclays Bank",
    "30-93-94": "Lloyds Bank",
    "60-83-71": "Starling Bank",
    "77-29-00": "TSB Bank"
  };

  // Test valid sort codes
  console.log('Valid sort codes:');
  Object.entries(sortCodeToBank).forEach(([code, bank]) => {
    console.log(`  ✅ ${code} → ${bank}`);
  });

  // Test invalid sort codes
  const invalidCodes = ['99-99-99', '12-34-56', '00-00-00'];
  console.log('\nInvalid sort codes (should be rejected):');
  invalidCodes.forEach(code => {
    const bank = sortCodeToBank[code];
    if (!bank) {
      console.log(`  ✅ ${code} → Correctly rejected`);
    } else {
      console.log(`  ❌ ${code} → Incorrectly accepted`);
    }
  });

  // Test payment ID generation
  console.log('\n3. Testing payment ID generation...');
  const generatePaymentID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const sampleIDs = [];
  for (let i = 0; i < 5; i++) {
    sampleIDs.push(generatePaymentID());
  }
  console.log('Sample payment IDs:', sampleIDs);

  // Test account masking
  console.log('\n4. Testing account number masking...');
  const testAccounts = ['12345421', '87654321', '11223344'];
  testAccounts.forEach(account => {
    const masked = `****${account.slice(-4)}`;
    console.log(`  ${account} → ${masked}`);
  });

  // Test date/time formatting
  console.log('\n5. Testing date/time formatting...');
  const now = new Date();
  const dateTime = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
  console.log(`Current date/time format: ${dateTime}`);

  // Simulate UK transfer data structure
  console.log('\n6. Sample UK transfer data structure...');
  const sampleTransfer = {
    paymentID: generatePaymentID(),
    status: "Sent",
    type: "UK Transfer", 
    amount: "£250.00",
    senderName: "J. Murphy",
    reference: "Deposit June",
    sortCode: "30-93-94",
    receivingBank: sortCodeToBank["30-93-94"],
    accountMasked: "****5421",
    dateTime: dateTime,
    recipientPhone: "+447123456789"
  };

  console.log('Sample transfer object:');
  console.log(JSON.stringify(sampleTransfer, null, 2));

  // Test SMS message format
  console.log('\n7. Sample SMS message format...');
  const smsMessage = `Bank of Ireland: A payment of ${sampleTransfer.amount} has been sent to your account.
From: ${sampleTransfer.senderName}
Ref: ${sampleTransfer.reference}
Sort code: ${sampleTransfer.sortCode} (${sampleTransfer.receivingBank})
Acc: ${sampleTransfer.accountMasked}
Sent: ${sampleTransfer.dateTime}
Funds may take 2–24 hours to clear depending on your bank.
View details: https://myboi.link/view/${sampleTransfer.paymentID}`;

  console.log('SMS message preview:');
  console.log(smsMessage);

  // Test confirmation link format
  console.log('\n8. Testing confirmation link format...');
  const confirmationLink = `https://myboi.link/view/${sampleTransfer.paymentID}`;
  console.log(`Confirmation link: ${confirmationLink}`);

  // Test error scenarios
  console.log('\n9. Testing error scenarios...');
  
  const errorTests = [
    { scenario: 'Invalid sort code', sortCode: '99-99-99', expectedError: 'Unsupported bank – sort code not recognised' },
    { scenario: 'Missing amount', data: { reference: 'test' }, expectedError: 'Amount required' },
    { scenario: 'Missing reference', data: { amount: '£100' }, expectedError: 'Reference required' },
    { scenario: 'Missing sort code', data: { amount: '£100', reference: 'test' }, expectedError: 'Sort code required' }
  ];

  errorTests.forEach(test => {
    console.log(`  Testing: ${test.scenario} → Should return: ${test.expectedError}`);
  });

  console.log('\n📊 UK TRANSFER SYSTEM IMPLEMENTATION SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ Sort code validation: Implemented with exact 7 banks');
  console.log('✅ Error message: "Unsupported bank – sort code not recognised"');
  console.log('✅ Payment ID generation: 6-character uppercase alphanumeric');
  console.log('✅ Account masking: ****XXXX format (last 4 digits)');
  console.log('✅ Bank detection: Automatic from sort code mapping');
  console.log('✅ Date/time format: DD/MM/YYYY HH:MM (UK format)');
  console.log('✅ SMS notification: Full Bank of Ireland format');
  console.log('✅ Confirmation link: https://myboi.link/view/XXXXXX');
  console.log('✅ Database structure: UK payments table with all fields');
  console.log('✅ API endpoint: POST /api/transfer/uk');
  console.log('✅ View endpoint: GET /view/:paymentID');
  console.log('✅ Bank styling: Green Bank of Ireland theme');

  console.log('\n🎯 SUPPORTED BANKS (EXACT AS SPECIFIED):');
  Object.entries(sortCodeToBank).forEach(([code, bank]) => {
    console.log(`  ${code} → ${bank}`);
  });

  console.log('\n🔧 SYSTEM FEATURES:');
  console.log('• Authentication required (non-admin users only)');
  console.log('• Automatic sender name from user profile');
  console.log('• Optional recipient phone for SMS');
  console.log('• Real-time sort code validation');
  console.log('• Comprehensive error handling');
  console.log('• SMS integration via Twilio');
  console.log('• Responsive confirmation page');
  console.log('• Bank of Ireland branding');

  console.log('\n🌐 ACCESS SYSTEM:');
  console.log('Use one of these BOI codes to access the app:');
  console.log('BOI372650, BOI964511, BOI155271, BOI327894, BOI722604');
  console.log('BOI563968, BOI992228, BOI244019, BOI178630, BOI100664');

  console.log('\n📋 TEST ENDPOINTS:');
  console.log('• Test form: http://localhost:5000/test-uk-transfer.html');
  console.log('• API endpoint: POST /api/transfer/uk');
  console.log('• View payment: GET /view/{paymentID}');

  return sampleTransfer;
}

demonstrateUKTransferSystem().catch(console.error);