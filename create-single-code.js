import Database from "@replit/database";
const db = new Database();

async function createSingleCode() {
  console.log('🔑 CREATING NEW BOI ACCESS CODE\n');
  
  // Generate 1 BOI code with 6 random numbers
  const numbers = Math.floor(100000 + Math.random() * 900000).toString();
  const code = `BOI${numbers}`;
  
  console.log(`📝 Generated Access Code: ${code}`);
  
  // Store code directly in database
  console.log('\n💾 Storing code in database...');
  
  try {
    const codeData = {
      code: code,
      createdAt: new Date().toISOString(),
      deviceLimits: {
        ios: 2,      // iOS devices get 2 uses
        android: 1,  // Android devices get 1 use
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
    console.log(`  ✅ ${code}: Stored successfully`);
    
  } catch (e) {
    console.log(`  ❌ ${code}: Error storing - ${e.message}`);
    return;
  }
  
  // Test the code to verify it works
  console.log('\n🧪 Testing access code functionality...');
  
  try {
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ ${code}: Validation working - ${data.message}`);
    } else {
      console.log(`  ❌ ${code}: Validation failed (${response.status})`);
      return;
    }
  } catch (e) {
    console.log(`  ❌ ${code}: Test error - ${e.message}`);
    return;
  }
  
  console.log('\n🎉 NEW BOI CODE CREATED SUCCESSFULLY');
  console.log('✅ Unique BOI code with 6 numbers');
  console.log('✅ Device-specific limits configured');
  console.log('✅ iOS devices: 2 uses per code');
  console.log('✅ Android/Other devices: 1 use per code');
  console.log('✅ Validation system working');
  
  console.log(`\n📋 NEW ACCESS CODE: ${code} (iOS: 2 uses, Others: 1 use)`);
  
  return code;
}

createSingleCode().catch(console.error);