import Database from "@replit/database";
const db = new Database();

async function create2AndroidCodes() {
  console.log('🔑 CREATING 2 BOI ACCESS CODES FOR ANDROID\n');
  
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
  
  console.log('\n💾 Storing codes with Android-optimized limits...');
  
  for (const code of codes) {
    try {
      const codeData = {
        code: code,
        createdAt: new Date().toISOString(),
        deviceLimits: {
          ios: 2,      // iOS devices get 2 uses
          android: 2,  // Android devices get 2 uses (modified for this request)
          other: 1     // Other devices get 1 use
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
      console.log(`  ✅ ${code}: Stored with Android=2 uses`);
      
    } catch (e) {
      console.log(`  ❌ ${code}: Error storing - ${e.message}`);
    }
  }
  
  console.log('\n📋 NEW ANDROID-OPTIMIZED ACCESS CODES:');
  codes.forEach((code, index) => {
    console.log(`  ${index + 1}. ${code} (iOS: 2 uses, Android: 2 uses, Others: 1 use)`);
  });
}

create2AndroidCodes().catch(console.error);