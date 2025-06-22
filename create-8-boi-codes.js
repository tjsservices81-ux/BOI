import Database from "@replit/database";
const db = new Database();

async function create8BOICodes() {
  console.log('🔑 CREATING 8 NEW BOI ACCESS CODES\n');
  
  // Generate 8 BOI codes with 6 random numbers
  const codes = [];
  const usedNumbers = new Set();
  
  while (codes.length < 8) {
    // Generate 6 random digits
    const numbers = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Ensure no duplicates
    if (!usedNumbers.has(numbers)) {
      usedNumbers.add(numbers);
      codes.push(`BOI${numbers}`);
    }
  }
  
  console.log('📝 Generated Access Codes:');
  codes.forEach((code, index) => {
    console.log(`  ${index + 1}. ${code}`);
  });
  
  // Store codes directly in database
  console.log('\n💾 Storing codes in database...');
  const results = [];
  
  for (const code of codes) {
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
      results.push(`✅ ${code}: Active`);
      
    } catch (e) {
      console.log(`  ❌ ${code}: Error storing - ${e.message}`);
      results.push(`❌ ${code}: Error`);
    }
  }
  
  // Test the first code to verify it works
  console.log('\n🧪 Testing access code functionality...');
  const testCode = codes[0];
  
  try {
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ ${testCode}: Validation working - ${data.message}`);
      results.push('✅ Validation: Working');
    } else {
      console.log(`  ❌ ${testCode}: Validation failed (${response.status})`);
      results.push('❌ Validation: Failed');
    }
  } catch (e) {
    console.log(`  ❌ ${testCode}: Test error - ${e.message}`);
    results.push('❌ Validation: Error');
  }
  
  console.log('\n📊 CODE CREATION SUMMARY');
  console.log('='.repeat(40));
  
  const successful = results.filter(r => r.startsWith('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nCreation Score: ${successful}/${total} operations successful`);
  
  if (successful === total) {
    console.log('\n🎉 NEW BOI CODES CREATED SUCCESSFULLY');
    console.log('✅ 8 unique BOI codes with 6 numbers each');
    console.log('✅ Device-specific limits configured');
    console.log('✅ iOS devices: 2 uses per code');
    console.log('✅ Android/Other devices: 1 use per code');
    console.log('✅ Validation system working');
    
    console.log('\n📋 NEW ACCESS CODES:');
    codes.forEach((code, index) => {
      console.log(`  ${index + 1}. ${code} (iOS: 2 uses, Others: 1 use)`);
    });
    
  } else {
    console.log('\n⚠️ Some codes may need manual verification');
  }
  
  return { codes, successful, total };
}

create8BOICodes().catch(console.error);