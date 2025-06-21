import Database from '@replit/database';
const db = new Database();

async function generate5TestCodes() {
  console.log('🔑 GENERATING 5 FRESH TEST CODES');
  console.log('='.repeat(40));
  
  const timestamp = Date.now();
  const codes = [
    `TEST_A_${timestamp}`,
    `TEST_B_${timestamp}`, 
    `TEST_C_${timestamp}`,
    `TEST_D_${timestamp}`,
    `TEST_E_${timestamp}`
  ];
  
  console.log('Creating codes...\n');
  
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    
    await db.set(`access_code_${code}`, {
      code: code,
      used: false,
      valid: true,
      createdAt: new Date().toISOString(),
      description: `Test code ${String.fromCharCode(65 + i)}: ${code}`
    });
    
    console.log(`✅ ${code}`);
  }
  
  console.log('\n📋 READY TO TEST:');
  console.log('Try any of these URLs:');
  for (const code of codes) {
    console.log(`   http://localhost:5000/?access=${code}`);
  }
  
  console.log('\n🔍 Verification:');
  for (const code of codes) {
    const verifyResponse = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    });
    
    const result = await verifyResponse.json();
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${code}: ${result.success ? 'Ready for use' : result.error}`);
  }
  
  return codes;
}

generate5TestCodes().catch(console.error);