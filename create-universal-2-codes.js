import Database from "@replit/database";
const db = new Database();

async function createUniversal2Codes() {
  console.log('🔑 CREATING BOI ACCESS CODES WITH UNIVERSAL 2-USE ACCESS\n');
  
  // Generate 2 BOI codes with 6 random numbers
  const codes = [];
  const usedNumbers = new Set();
  
  while (codes.length < 2) {
    const numbers = Math.floor(100000 + Math.random() * 900000).toString();
    if (!usedNumbers.has(numbers)) {
      usedNumbers.add(numbers);
      codes.push(`BOI${numbers}`);
    }
  }
  
  console.log('📝 Generated Access Codes:');
  codes.forEach((code, index) => {
    console.log(`  ${index + 1}. ${code}`);
  });
  
  console.log('\n💾 Storing codes with universal 2-use limits...');
  
  for (const code of codes) {
    try {
      const codeData = {
        code: code,
        createdAt: new Date().toISOString(),
        deviceLimits: {
          ios: 2,      // iOS devices get 2 uses
          android: 2,  // Android devices get 2 uses  
          other: 2     // Other devices get 2 uses (enhanced from 1)
        },
        usageCount: {
          ios: 0,
          android: 0,
          other: 0
        },
        totalUsage: 0,
        active: true
      };
      
      await db.set(`access_code_${code}`, JSON.stringify(codeData));
      console.log(`  ✅ ${code}: Stored with universal 2-use access`);
      
    } catch (e) {
      console.log(`  ❌ ${code}: Error storing - ${e.message}`);
    }
  }
  
  console.log('\n📋 NEW UNIVERSAL ACCESS CODES:');
  codes.forEach((code, index) => {
    console.log(`  ${index + 1}. ${code} (All devices: 2 uses each)`);
  });
  
  console.log('\n🎉 UNIVERSAL ACCESS CODES CREATED SUCCESSFULLY');
  console.log('✅ All device types now have 2 uses per code');
  console.log('✅ iOS: 2 uses | Android: 2 uses | Others: 2 uses');
}

createUniversal2Codes().catch(console.error);