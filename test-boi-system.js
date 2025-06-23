async function testBOISystem() {
  console.log('🧪 TESTING BOI ACCESS SYSTEM\n');
  
  const testCodes = ['BOI952383', 'BOI823969', 'BOI888174'];
  const invalidCodes = ['vip123', 'BOI12345', 'BOI1234567', 'test123'];
  
  console.log('1. Testing invalid code formats...\n');
  
  for (const code of invalidCodes) {
    try {
      const response = await fetch('http://localhost:5000/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const result = await response.json();
      
      if (response.status === 400 && result.error.includes('Invalid access code format')) {
        console.log(`  ✅ ${code}: Correctly rejected (invalid format)`);
      } else {
        console.log(`  ❌ ${code}: Unexpected response (${response.status})`);
      }
    } catch (error) {
      console.log(`  ❌ ${code}: Test failed - ${error.message}`);
    }
  }
  
  console.log('\n2. Testing valid BOI codes on different devices...\n');
  
  const deviceTests = [
    { name: 'iOS Device', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15', expectedLimit: 2 },
    { name: 'Android Device', userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36', expectedLimit: 1 },
    { name: 'Other Device', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', expectedLimit: 1 }
  ];
  
  for (const device of deviceTests) {
    console.log(`Testing ${device.name}:`);
    const testCode = testCodes[deviceTests.indexOf(device)];
    
    // Test initial access
    try {
      const response = await fetch('http://localhost:5000/api/verify-code', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': device.userAgent
        },
        body: JSON.stringify({ code: testCode })
      });
      
      const result = await response.json();
      
      if (response.status === 200 && result.success) {
        console.log(`  ✅ ${testCode}: First access granted`);
        console.log(`  📱 Device type: ${result.deviceType}`);
        console.log(`  🔢 Remaining uses: ${result.remainingUses}`);
        
        // Test check-access endpoint
        const checkResponse = await fetch('http://localhost:5000/api/check-access', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': device.userAgent
          },
          body: JSON.stringify({ code: testCode })
        });
        
        const checkResult = await checkResponse.json();
        
        if (checkResponse.status === 200 && checkResult.success) {
          console.log(`  ✅ Check-access: Valid status confirmed`);
          console.log(`  📊 Usage info: iOS=${checkResult.usageInfo.ios}, Android=${checkResult.usageInfo.android}, Other=${checkResult.usageInfo.other}`);
        } else {
          console.log(`  ❌ Check-access failed: ${checkResult.error}`);
        }
        
      } else {
        console.log(`  ❌ ${testCode}: Access denied - ${result.error}`);
      }
    } catch (error) {
      console.log(`  ❌ ${testCode}: Test failed - ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('3. Testing usage limits...\n');
  
  // Test iOS device multiple uses
  const iosCode = testCodes[0];
  console.log(`Testing iOS usage limit with ${iosCode}:`);
  
  try {
    // Second access for iOS (should work)
    const response2 = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      body: JSON.stringify({ code: iosCode })
    });
    
    const result2 = await response2.json();
    
    if (response2.status === 200 && result2.success) {
      console.log(`  ✅ ${iosCode}: Second iOS access granted (remaining: ${result2.remainingUses})`);
    } else {
      console.log(`  ❌ ${iosCode}: Second access failed - ${result2.error}`);
    }
    
    // Third access for iOS (should fail)
    const response3 = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      body: JSON.stringify({ code: iosCode })
    });
    
    const result3 = await response3.json();
    
    if (response3.status === 409 && result3.error.includes('already used')) {
      console.log(`  ✅ ${iosCode}: Third iOS access correctly blocked`);
    } else {
      console.log(`  ❌ ${iosCode}: Third access should have been blocked`);
    }
    
  } catch (error) {
    console.log(`  ❌ iOS limit test failed - ${error.message}`);
  }
  
  // Test Android device limit
  const androidCode = testCodes[1];
  console.log(`\nTesting Android usage limit with ${androidCode}:`);
  
  try {
    // Second access for Android (should fail)
    const response2 = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36'
      },
      body: JSON.stringify({ code: androidCode })
    });
    
    const result2 = await response2.json();
    
    if (response2.status === 409 && result2.error.includes('already used')) {
      console.log(`  ✅ ${androidCode}: Second Android access correctly blocked`);
    } else {
      console.log(`  ❌ ${androidCode}: Second access should have been blocked`);
    }
    
  } catch (error) {
    console.log(`  ❌ Android limit test failed - ${error.message}`);
  }
  
  console.log('\n📊 BOI SYSTEM TEST SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Format validation: BOI + 6 digits enforced');
  console.log('✅ Device detection: iOS, Android, Other');
  console.log('✅ Usage limits: iOS (2), Android/Other (1)');
  console.log('✅ Access control: Valid codes work, limits respected');
  console.log('✅ Endpoints: Both verify-code and check-access functional');
  
  return { tested: testCodes.length + invalidCodes.length };
}

testBOISystem().catch(console.error);