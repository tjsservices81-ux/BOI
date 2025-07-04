import Database from "@replit/database";
const db = new Database();

async function createFreshCode() {
  console.log('🔑 CREATING FRESH BOI ACCESS CODE\n');
  
  // Generate 1 BOI code with 6 random numbers
  const numbers = Math.floor(100000 + Math.random() * 900000).toString();
  const code = `BOI${numbers}`;
  
  console.log(`📝 Generated Access Code: ${code}`);
  
  console.log('\n💾 Storing code with universal 2-use limits...');
  
  try {
    const codeData = {
      code: code,
      createdAt: new Date().toISOString(),
      deviceLimits: {
        ios: 2,      // iOS devices get 2 uses
        android: 2,  // Android devices get 2 uses  
        other: 2     // Other devices get 2 uses
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
    console.log(`✅ ${code}: Stored with universal 2-use access`);
    
  } catch (e) {
    console.log(`❌ ${code}: Error storing - ${e.message}`);
    return;
  }
  
  console.log('\n📋 NEW FRESH ACCESS CODE:');
  console.log(`  ${code} (All devices: 2 uses each)`);
  
  console.log('\n🎉 FRESH ACCESS CODE CREATED SUCCESSFULLY');
  console.log('✅ All device types have 2 uses');
  console.log('✅ iOS: 2 uses | Android: 2 uses | Others: 2 uses');
}

createFreshCode().catch(console.error);