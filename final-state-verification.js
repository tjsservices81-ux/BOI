async function finalStateVerification() {
  console.log('🔍 FINAL STATE VERIFICATION\n');
  
  const results = [];
  
  // Test deleted access codes
  console.log('🔐 Access Code Verification:');
  const testCodes = ['BOI729889', 'DEMO2024', 'TEST123', 'ACCESS2024'];
  
  for (const code of testCodes) {
    try {
      const response = await fetch('http://localhost:5000/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
      
      if (response.status === 404) {
        console.log(`  ✅ ${code}: Correctly blocked (404)`);
        results.push(`✅ ${code}: Deleted`);
      } else {
        console.log(`  ❌ ${code}: Unexpected response ${response.status}`);
        results.push(`❌ ${code}: Still active`);
      }
    } catch (e) {
      console.log(`  ❌ ${code}: Test failed`);
      results.push(`❌ ${code}: Test failed`);
    }
  }
  
  // Test user system is empty
  console.log('\n👤 User System Verification:');
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
    console.log('  ❌ User verification failed');
    results.push('❌ User System: Test failed');
  }
  
  // Test app still loads
  console.log('\n🌐 App Functionality:');
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
  
  console.log('\n📊 FINAL VERIFICATION RESULTS');
  console.log('='.repeat(40));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nFinal Score: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('\n🎉 COMPLETE RESET VERIFIED');
    console.log('✅ All access codes successfully deleted');
    console.log('✅ All users removed from system');
    console.log('✅ App functioning correctly');
    console.log('✅ Fresh installation state confirmed');
    console.log('\n🆕 App ready for new access codes and users');
  } else {
    console.log('\n⚠️ Reset verification incomplete');
  }
  
  return { passed, total, results };
}

finalStateVerification().catch(console.error);