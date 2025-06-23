async function verifyCodeWorking() {
  const testCode = 'BOI607505';
  
  try {
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    
    const result = await response.json();
    
    console.log(`Code ${testCode} verification:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, result);
    
    if (response.status === 200 && result.success) {
      console.log(`✅ Code is working and granted access`);
    } else {
      console.log(`❌ Code verification failed`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

verifyCodeWorking();