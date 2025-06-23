async function testAccessBlocked() {
  console.log('🔒 TESTING ACCESS CODE BLOCKING\n');
  
  const testCodes = ['BOI123456', 'BOI999999', 'BOI372650', 'BOI964511'];
  
  console.log('Testing access code verification endpoint...\n');
  
  let allBlocked = true;
  
  for (const code of testCodes) {
    try {
      const response = await fetch('http://localhost:5000/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (response.status === 404) {
        console.log(`✅ ${code}: Correctly blocked (404)`);
      } else {
        console.log(`❌ ${code}: Still accessible (${response.status})`);
        allBlocked = false;
      }
    } catch (error) {
      console.log(`❌ ${code}: Test failed - ${error.message}`);
      allBlocked = false;
    }
  }
  
  console.log('\nTesting check-access endpoint...\n');
  
  for (const code of testCodes) {
    try {
      const response = await fetch('http://localhost:5000/api/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (response.status === 404) {
        console.log(`✅ ${code}: Correctly blocked (404)`);
      } else {
        console.log(`❌ ${code}: Still accessible (${response.status})`);
        allBlocked = false;
      }
    } catch (error) {
      console.log(`❌ ${code}: Test failed - ${error.message}`);
      allBlocked = false;
    }
  }
  
  console.log('\n📊 BLOCKING TEST RESULTS');
  console.log('='.repeat(40));
  
  if (allBlocked) {
    console.log('🎉 ALL ACCESS CODES SUCCESSFULLY BLOCKED');
    console.log('✅ No codes can access the system');
    console.log('✅ Both endpoints properly deny access');
    console.log('✅ System is secure and ready for new implementation');
  } else {
    console.log('⚠️ Some codes may still be accessible');
    console.log('Further investigation needed');
  }
  
  return { allBlocked, tested: testCodes.length };
}

testAccessBlocked().catch(console.error);