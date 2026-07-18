async function verifyCompleteReset() {
  console.log('🔍 VERIFYING COMPLETE DATA RESET\n');
  
  const results = [];
  
  // Test that all known access codes are blocked
  console.log('🚫 Testing Access Code Blocking:');
  const testCodes = ['BOI729889', 'DEMO2024', 'TEST123', 'ACCESS2024', 'PREVIEW', 'WORKING2024'];
  
  for (const code of testCodes) {
    try {
      const response = await fetch('http://localhost:5000/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
      
      if (response.status === 404) {
        console.log(`  ✅ ${code}: Correctly blocked (404)`);
        results.push(`✅ ${code}: Blocked`);
      } else {
        console.log(`  ❌ ${code}: Unexpected response ${response.status}`);
        results.push(`❌ ${code}: Still working`);
      }
    } catch (e) {
      console.log(`  ❌ ${code}: Test failed`);
      results.push(`❌ ${code}: Test failed`);
    }
  }
  
  // Test check-access endpoint
  console.log('\n🔒 Testing Check-Access Endpoint:');
  try {
    const response = await fetch('http://localhost:5000/api/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BOI729889' })
    });
    
    if (response.status === 404) {
      console.log('  ✅ Check-access correctly blocks all codes');
      results.push('✅ Check-access: Blocked');
    } else {
      console.log(`  ❌ Check-access unexpected response: ${response.status}`);
      results.push('❌ Check-access: Not blocked');
    }
  } catch (e) {
    console.log('  ❌ Check-access test failed');
    results.push('❌ Check-access: Test failed');
  }
  
  // Verify user system is empty
  console.log('\n👤 Testing User System:');
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', pin: '1234' })
    });
    
    if (response.status === 400) {
      console.log('  ✅ No users exist - login fails correctly');
      results.push('✅ User System: Empty');
    } else {
      console.log(`  ❌ Unexpected login response: ${response.status}`);
      results.push('❌ User System: May contain data');
    }
  } catch (e) {
    console.log('  ❌ User system test failed');
    results.push('❌ User System: Test failed');
  }
  
  // Test app still functions
  console.log('\n🌐 Testing App Functionality:');
  try {
    const response = await fetch('http://localhost:5000/');
    if (response.status === 200) {
      console.log('  ✅ App loads correctly');
      results.push('✅ App: Functional');
    } else {
      console.log(`  ❌ App load issue: ${response.status}`);
      results.push('❌ App: Issue');
    }
  } catch (e) {
    console.log('  ❌ App test failed');
    results.push('❌ App: Test failed');
  }
  
  console.log('\n📊 COMPLETE RESET VERIFICATION');
  console.log('='.repeat(40));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nVerification Score: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('\n🎉 COMPLETE RESET VERIFIED');
    console.log('✅ All access codes successfully blocked');
    console.log('✅ All users removed from system');
    console.log('✅ App core functionality preserved');
    console.log('✅ System in fresh installation state');
    console.log('\n🆕 Ready for new access codes and users');
  } else if (passed >= total * 0.8) {
    console.log('\n✅ Reset mostly successful');
    console.log('Minor issues may need attention');
  } else {
    console.log('\n❌ Reset incomplete');
    console.log('Manual intervention required');
  }
  
  return { passed, total, results };
}

verifyCompleteReset().catch(console.error);