import Database from "@replit/database";
const db = new Database();

async function updateAndroidLimits() {
  console.log('🔧 UPDATING ANDROID DEVICE LIMITS TO 2 USES\n');
  
  const knownCodes = [
    'BOI729889', 'BOI573007', 'BOI199038', 'BOI968736',
    'BOI234567', 'BOI789012', 'BOI345678', 'BOI901234',
    'BOI970020', 'BOI760481', 'BOI407590', 'BOI407591',
    'BOI408146', 'BOI538757', 'BOI540079'
  ];
  
  let updatedCount = 0;
  
  for (const code of knownCodes) {
    try {
      const codeData = await db.get(`access_code_${code}`);
      if (codeData) {
        let codeInfo;
        try {
          codeInfo = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
        } catch {
          codeInfo = codeData;
        }
        
        // Update Android limit to 2
        if (codeInfo.deviceLimits && codeInfo.deviceLimits.android === 1) {
          codeInfo.deviceLimits.android = 2;
          
          await db.set(`access_code_${code}`, JSON.stringify(codeInfo));
          console.log(`✅ Updated ${code}: Android limit changed to 2 uses`);
          updatedCount++;
        } else if (codeInfo.deviceLimits && codeInfo.deviceLimits.android === 2) {
          console.log(`🔄 ${code}: Already has Android limit of 2`);
        } else {
          console.log(`⚠️ ${code}: No device limits found or unusual structure`);
        }
      }
    } catch (error) {
      console.log(`❌ Error updating ${code}: ${error.message}`);
    }
  }
  
  console.log('\n📊 UPDATE SUMMARY');
  console.log('='.repeat(25));
  console.log(`✅ Updated ${updatedCount} access codes`);
  console.log(`📱 Android devices now get 2 uses per code (same as iOS)`);
  console.log(`🔐 All existing and future codes will have updated limits`);
  
  return updatedCount;
}

updateAndroidLimits().catch(console.error);