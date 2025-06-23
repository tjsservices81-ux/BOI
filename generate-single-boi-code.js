import Database from "@replit/database";
const db = new Database();

async function generateSingleBOICode() {
  console.log('🆕 GENERATING NEW BOI ACCESS CODE\n');
  
  // Generate fresh BOI code
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  const newCode = `BOI${randomNumber}`;
  
  // Store code with device-specific limits
  const codeInfo = {
    code: newCode,
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
    devices: [],
    lastUsedAt: null
  };
  
  await db.set(`access_code_${newCode}`, JSON.stringify(codeInfo));
  
  console.log(`✅ Generated: ${newCode}`);
  console.log('📱 Device Limits: iOS (2 uses), Android/Other (1 use each)');
  console.log('🟢 Status: Active and ready for use');
  
  // Test the code
  try {
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode })
    });
    
    if (response.status === 200) {
      console.log('✅ Code verified and working');
    } else {
      console.log('⚠️ Code generated but verification had issues');
    }
  } catch (error) {
    console.log('⚠️ Code generated but could not test verification');
  }
  
  return newCode;
}

generateSingleBOICode().then(code => {
  console.log(`\n🎫 YOUR NEW BOI ACCESS CODE: ${code}`);
}).catch(console.error);