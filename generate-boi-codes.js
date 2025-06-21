async function generateBOICodes() {
  console.log('🔑 GENERATING BOI ACCESS CODES\n');
  
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
  
  // Store codes in database with device limits
  console.log('\n💾 Storing codes in database...');
  const results = [];
  
  for (const code of codes) {
    try {
      const response = await fetch('http://localhost:5000/api/admin/generate-otc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: code,
          deviceLimits: {
            ios: 2,      // iOS devices get 2 uses
            android: 1,  // Android devices get 1 use
            other: 1     // Other devices get 1 use
          }
        })
      });
      
      if (response.ok) {
        console.log(`  ✅ ${code}: Stored successfully`);
        results.push(`✅ ${code}: Active`);
      } else {
        console.log(`  ❌ ${code}: Storage failed (${response.status})`);
        results.push(`❌ ${code}: Failed`);
      }
    } catch (e) {
      console.log(`  ❌ ${code}: Error storing`);
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
      console.log(`  ✅ ${testCode}: Validation working`);
      results.push('✅ Validation: Working');
    } else {
      console.log(`  ❌ ${testCode}: Validation failed (${response.status})`);
      results.push('❌ Validation: Failed');
    }
  } catch (e) {
    console.log(`  ❌ ${testCode}: Test error`);
    results.push('❌ Validation: Error');
  }
  
  console.log('\n📊 CODE GENERATION SUMMARY');
  console.log('='.repeat(40));
  
  const successful = results.filter(r => r.startsWith('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nGeneration Score: ${successful}/${total} operations successful`);
  
  if (successful === total) {
    console.log('\n🎉 ALL BOI CODES GENERATED SUCCESSFULLY');
    console.log('✅ 10 unique BOI codes created');
    console.log('✅ Device-specific limits configured');
    console.log('✅ iOS devices: 2 uses per code');
    console.log('✅ Android/Other devices: 1 use per code');
    console.log('✅ Validation system working');
    console.log('\n🚀 System ready for user access');
  } else {
    console.log('\n⚠️ Some codes may need manual verification');
  }
  
  return { codes, successful, total };
}

generateBOICodes().catch(console.error);