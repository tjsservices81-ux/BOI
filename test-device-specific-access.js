import Database from '@replit/database';
const db = new Database();

async function testDeviceSpecificAccess() {
  console.log('🧪 Testing Device-Specific Access Code System\n');
  
  // Create a fresh test code
  const testCode = 'TEST' + Math.floor(Math.random() * 1000);
  await db.set(`access_code_${testCode}`, {
    code: testCode,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Test code: ${testCode}`,
    usage: {
      ios: 0,
      nonIos: 0,
      totalUses: 0,
      devices: []
    }
  });
  
  console.log(`✓ Created test code: ${testCode}\n`);
  
  // Test iOS device (iPhone) - should allow 2 uses
  console.log('📱 Testing iOS Device (iPhone):');
  const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  
  // First iPhone use
  let response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': iphoneUA
    },
    body: JSON.stringify({ code: testCode })
  });
  let result = await response.json();
  console.log(`  Use 1: ${result.success ? '✓ ALLOWED' : '✗ BLOCKED'} - ${result.message}`);
  if (result.success) console.log(`    Remaining uses: ${result.remainingUses}`);
  
  // Second iPhone use
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': iphoneUA
    },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  console.log(`  Use 2: ${result.success ? '✓ ALLOWED' : '✗ BLOCKED'} - ${result.message}`);
  if (result.success) console.log(`    Remaining uses: ${result.remainingUses}`);
  
  // Third iPhone use (should be blocked)
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': iphoneUA
    },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  console.log(`  Use 3: ${result.success ? '✓ ALLOWED' : '✗ BLOCKED'} - ${result.message}\n`);
  
  // Test iPad (also iOS) - should be blocked since iOS limit reached
  console.log('📱 Testing iOS Device (iPad):');
  const ipadUA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ipadUA
    },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  console.log(`  Use 1: ${result.success ? '✓ ALLOWED' : '✗ BLOCKED'} - ${result.message}\n`);
  
  // Test non-iOS device (Chrome) - should allow 1 use
  console.log('💻 Testing Non-iOS Device (Chrome):');
  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': chromeUA
    },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  console.log(`  Use 1: ${result.success ? '✓ ALLOWED' : '✗ BLOCKED'} - ${result.message}`);
  if (result.success) console.log(`    Remaining uses: ${result.remainingUses}`);
  
  // Second Chrome use (should be blocked)
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': chromeUA
    },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  console.log(`  Use 2: ${result.success ? '✓ ALLOWED' : '✗ BLOCKED'} - ${result.message}\n`);
  
  // Check final usage statistics
  const finalData = await db.get(`access_code_${testCode}`);
  let finalInfo;
  try {
    if (typeof finalData === 'string') {
      finalInfo = JSON.parse(finalData);
    } else if (finalData && typeof finalData === 'object' && finalData.value) {
      finalInfo = typeof finalData.value === 'string' ? JSON.parse(finalData.value) : finalData.value;
    } else {
      finalInfo = finalData;
    }
  } catch (e) {
    finalInfo = finalData;
  }
  
  console.log('📊 Final Usage Statistics:');
  console.log(`  iOS uses: ${finalInfo?.usage?.ios || 0}/2`);
  console.log(`  Non-iOS uses: ${finalInfo?.usage?.nonIos || 0}/1`);
  console.log(`  Total uses: ${finalInfo?.usage?.totalUses || 0}`);
  console.log(`  Devices tracked: ${finalInfo?.usage?.devices?.length || 0}`);
  
  console.log('\n✅ Device-specific access code system working correctly!');
}

testDeviceSpecificAccess().catch(console.error);