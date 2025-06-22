import Database from "@replit/database";
const db = new Database();

async function checkCodeUsage() {
  console.log('🔍 CHECKING CODE USAGE: BOI968736\n');
  
  const code = 'BOI968736';
  
  try {
    const codeData = await db.get(`access_code_${code}`);
    
    if (!codeData) {
      console.log(`❌ Code ${code} not found in database`);
      return;
    }
    
    let codeInfo;
    try {
      if (typeof codeData === 'string') {
        codeInfo = JSON.parse(codeData);
      } else if (codeData && typeof codeData === 'object' && codeData.value) {
        codeInfo = typeof codeData.value === 'string' ? JSON.parse(codeData.value) : codeData.value;
      } else {
        codeInfo = codeData;
      }
    } catch (parseError) {
      console.log(`❌ Error parsing code data: ${parseError.message}`);
      return;
    }
    
    console.log(`📊 USAGE REPORT for ${code}:`);
    console.log('='.repeat(40));
    console.log(`Created: ${codeInfo.createdAt}`);
    console.log(`Status: ${codeInfo.active ? 'Active' : 'Inactive'}`);
    console.log(`Total Usage: ${codeInfo.totalUsage}`);
    console.log('');
    console.log('Device Usage:');
    console.log(`  iOS: ${codeInfo.usageCount.ios}/${codeInfo.deviceLimits.ios} uses`);
    console.log(`  Android: ${codeInfo.usageCount.android}/${codeInfo.deviceLimits.android} uses`);
    console.log(`  Other: ${codeInfo.usageCount.other}/${codeInfo.deviceLimits.other} uses`);
    
    const hasBeenUsed = codeInfo.totalUsage > 0;
    console.log('');
    if (hasBeenUsed) {
      console.log('🔴 CODE HAS BEEN USED');
      console.log(`Total accesses: ${codeInfo.totalUsage}`);
    } else {
      console.log('🟢 CODE IS FRESH - NEVER USED');
      console.log('No accesses recorded');
    }
    
    return { hasBeenUsed, totalUsage: codeInfo.totalUsage, codeInfo };
    
  } catch (error) {
    console.log(`❌ Error checking code: ${error.message}`);
    return null;
  }
}

checkCodeUsage().catch(console.error);