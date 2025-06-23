import Database from "@replit/database";
const db = new Database();

async function createFreshBOISystem() {
  console.log('🏦 CREATING FRESH BOI ACCESS SYSTEM\n');
  
  // Generate 10 fresh BOI access codes
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    codes.push(`BOI${randomNumber}`);
  }
  
  console.log('📋 Generated BOI Access Codes:');
  codes.forEach((code, index) => {
    console.log(`  ${index + 1}. ${code}`);
  });
  
  console.log('\n💾 Storing codes in database...');
  
  // Store each code with proper device-specific limits
  for (const code of codes) {
    const codeInfo = {
      code: code,
      valid: true,
      created: new Date().toISOString(),
      usageCount: {
        ios: 0,        // iOS devices can use 2 times
        android: 0,    // Android devices can use 1 time
        other: 0       // Other devices can use 1 time
      },
      deviceLimits: {
        ios: 2,        // iOS limit: 2 uses
        android: 1,    // Android limit: 1 use
        other: 1       // Other devices limit: 1 use
      },
      totalUsage: 0,
      devices: [],     // Track unique device identifiers
      lastUsedAt: null
    };
    
    await db.set(`access_code_${code}`, JSON.stringify(codeInfo));
    console.log(`  ✅ ${code}: Stored with device limits (iOS: 2, Android/Other: 1)`);
  }
  
  console.log('\n🧪 Testing first code for verification...');
  const testCode = codes[0];
  
  try {
    // Test on the blocked server (should fail)
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    
    if (response.status === 404) {
      console.log(`  ✅ ${testCode}: Correctly blocked by current server (ready for enabling)`);
    } else {
      console.log(`  ❌ ${testCode}: Unexpected response (${response.status})`);
    }
  } catch (error) {
    console.log(`  ❌ ${testCode}: Test failed - ${error.message}`);
  }
  
  console.log('\n📊 BOI SYSTEM CREATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Generated: ${codes.length} fresh BOI access codes`);
  console.log('✅ Format: BOI + 6 random digits');
  console.log('✅ Device Limits: iOS (2 uses), Android/Other (1 use)');
  console.log('✅ Stored: All codes saved to database');
  console.log('✅ Status: Ready for activation');
  
  console.log('\n🔑 ACCESS CODES READY FOR USE:');
  console.log('='.repeat(50));
  codes.forEach((code, index) => {
    console.log(`${index + 1}. ${code} - iOS: 0/2 uses, Android/Other: 0/1 uses`);
  });
  
  console.log('\n⚠️ IMPORTANT: Server endpoints are currently disabled');
  console.log('💡 To activate codes, re-enable the verification endpoints in server/routes.ts');
  
  return { codes, total: codes.length };
}

createFreshBOISystem().catch(console.error);