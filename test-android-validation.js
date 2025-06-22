import Database from "@replit/database";
const db = new Database();

async function testAndroidValidation() {
  console.log('🔍 TESTING ANDROID VALIDATION FOR BOI968736\n');
  
  const code = 'BOI968736';
  
  // First check current database state
  console.log('📊 Current Database State:');
  const codeData = await db.get(`access_code_${code}`);
  
  if (codeData) {
    let codeInfo;
    try {
      if (typeof codeData === 'string') {
        codeInfo = JSON.parse(codeData);
      } else if (codeData && typeof codeData === 'object' && codeData.value) {
        codeInfo = typeof codeData.value === 'string' ? JSON.parse(codeData.value) : codeData.value;
      } else {
        codeInfo = codeData;
      }
      
      console.log(`  Total Usage: ${codeInfo.totalUsage}`);
      console.log(`  Android Usage: ${codeInfo.usageCount.android}/${codeInfo.deviceLimits.android}`);
      console.log(`  iOS Usage: ${codeInfo.usageCount.ios}/${codeInfo.deviceLimits.ios}`);
      console.log(`  Other Usage: ${codeInfo.usageCount.other}/${codeInfo.deviceLimits.other}`);
    } catch (e) {
      console.log('  Error parsing data');
    }
  }
  
  // Test with Android user agent
  console.log('\n🤖 Testing Android Access:');
  try {
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
      },
      body: JSON.stringify({ code: code })
    });
    
    const data = await response.json();
    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
    
    if (response.status === 429) {
      console.log('🔴 ANDROID CODE LIMIT REACHED');
    } else if (response.ok) {
      console.log('🟢 ANDROID ACCESS GRANTED');
    } else {
      console.log('❌ ANDROID ACCESS DENIED');
    }
    
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  
  // Check database state after test
  console.log('\n📊 Database State After Test:');
  const updatedCodeData = await db.get(`access_code_${code}`);
  
  if (updatedCodeData) {
    let updatedCodeInfo;
    try {
      if (typeof updatedCodeData === 'string') {
        updatedCodeInfo = JSON.parse(updatedCodeData);
      } else if (updatedCodeData && typeof updatedCodeData === 'object' && updatedCodeData.value) {
        updatedCodeInfo = typeof updatedCodeData.value === 'string' ? JSON.parse(updatedCodeData.value) : updatedCodeData.value;
      } else {
        updatedCodeInfo = updatedCodeData;
      }
      
      console.log(`  Total Usage: ${updatedCodeInfo.totalUsage}`);
      console.log(`  Android Usage: ${updatedCodeInfo.usageCount.android}/${updatedCodeInfo.deviceLimits.android}`);
      console.log(`  iOS Usage: ${updatedCodeInfo.usageCount.ios}/${updatedCodeInfo.deviceLimits.ios}`);
      console.log(`  Other Usage: ${updatedCodeInfo.usageCount.other}/${updatedCodeInfo.deviceLimits.other}`);
      
      if (updatedCodeInfo.usageCount.android >= updatedCodeInfo.deviceLimits.android) {
        console.log('\n🔴 ANDROID LIMIT REACHED - Code will show as "already used" on Android');
      } else {
        console.log('\n🟢 ANDROID STILL HAS USES AVAILABLE');
      }
      
    } catch (e) {
      console.log('  Error parsing updated data');
    }
  }
}

testAndroidValidation().catch(console.error);