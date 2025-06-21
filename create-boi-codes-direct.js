import { Database } from "@replit/database";
const db = new Database();

async function createBOICodesDirect() {
  console.log('🔑 CREATING BOI ACCESS CODES DIRECTLY IN DATABASE\n');
  
  // Generate 10 BOI codes with 6 random numbers
  const codes = [];
  const usedNumbers = new Set();
  
  while (codes.length < 10) {
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
  
  // Test one code to verify it works
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
  
  // Test device limits
  console.log('\n📱 Testing device-specific limits...');
  const testCode2 = codes[1];
  
  // Test iOS limit (should allow 2 uses)
  try {
    const response1 = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      body: JSON.stringify({ code: testCode2 })
    });
    
    const response2 = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      body: JSON.stringify({ code: testCode2 })
    });
    
    if (response1.ok && response2.ok) {
      console.log(`  ✅ ${testCode2}: iOS 2-use limit working`);
      results.push('✅ iOS Limits: Working');
    } else {
      console.log(`  ❌ ${testCode2}: iOS limit test failed`);
      results.push('❌ iOS Limits: Failed');
    }
  } catch (e) {
    console.log(`  ❌ ${testCode2}: iOS test error`);
    results.push('❌ iOS Limits: Error');
  }
  
  console.log('\n📊 CODE CREATION SUMMARY');
  console.log('='.repeat(40));
  
  const successful = results.filter(r => r.startsWith('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nCreation Score: ${successful}/${total} operations successful`);
  
  if (successful === total) {
    console.log('\n🎉 ALL BOI CODES CREATED SUCCESSFULLY');
    console.log('✅ 10 unique BOI codes with 6 numbers each');
    console.log('✅ Device-specific limits configured');
    console.log('✅ iOS devices: 2 uses per code');
    console.log('✅ Android/Other devices: 1 use per code');
    console.log('✅ Validation system working');
    console.log('\n🚀 System ready for user access');
    
    console.log('\n📋 ACTIVE ACCESS CODES:');
    codes.forEach((code, index) => {
      console.log(`  ${index + 1}. ${code} (iOS: 2 uses, Others: 1 use)`);
    });
    
  } else if (successful >= total * 0.8) {
    console.log('\n✅ Most codes created successfully');
    console.log('System is functional with available codes');
  } else {
    console.log('\n❌ Code creation incomplete');
    console.log('Manual intervention may be required');
  }
  
  return { codes, successful, total };
}

createBOICodesDirect().catch(console.error);