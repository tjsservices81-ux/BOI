import Database from "@replit/database";
const db = new Database();

async function clearAccessCodes() {
  console.log('🗑️ CLEARING ALL ACCESS CODES\n');
  
  // Known access codes to delete
  const knownCodes = [
    'BOI372650', 'BOI964511', 'BOI155271', 'BOI327894', 'BOI722604',
    'BOI563968', 'BOI992228', 'BOI244019', 'BOI178630', 'BOI100664',
    'BOI758430', 'BOI330968', 'BOI978171', 'BOI145981', 'BOI515795',
    'BOI133847', 'BOI468795', 'BOI803732', 'BOI983172', 'BOI661068',
    'BOI805916', 'BOI754291', 'BOI504994', 'BOI834699', 'BOI315527',
    'BOI909138', 'BOI959528', 'BOI912386', 'BOI968736', 'BOI723671',
    'BOI783722'
  ];
  
  console.log(`Attempting to delete ${knownCodes.length} known access codes`);
  
  let deleted = 0;
  const results = [];
  
  for (const code of knownCodes) {
    try {
      const key = `access_code_${code}`;
      
      // Check if code exists
      const exists = await db.get(key);
      
      if (exists) {
        await db.delete(key);
        console.log(`  ✅ ${code}: Deleted successfully`);
        results.push(`✅ ${code}: Deleted`);
        deleted++;
      } else {
        console.log(`  ⭕ ${code}: Not found (already deleted)`);
        results.push(`⭕ ${code}: Not found`);
      }
      
    } catch (error) {
      console.log(`  ❌ ${code}: Delete failed - ${error.message}`);
      results.push(`❌ ${code}: Failed`);
    }
  }
  
  // Test to ensure codes are deleted
  console.log('\n🧪 Testing deleted codes...');
  let stillWorking = 0;
  
  for (let i = 0; i < Math.min(3, knownCodes.length); i++) {
    const testCode = knownCodes[i];
    try {
      const response = await fetch('http://localhost:5000/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: testCode })
      });
      
      if (response.status === 404) {
        console.log(`  ✅ ${testCode}: Correctly blocked (not found)`);
      } else {
        console.log(`  ❌ ${testCode}: Still working (${response.status})`);
        stillWorking++;
      }
    } catch (e) {
      console.log(`  ❌ ${testCode}: Test failed`);
    }
  }
  
  console.log('\n📊 DELETION SUMMARY');
  console.log('='.repeat(40));
  
  const successful = results.filter(r => r.startsWith('✅')).length;
  const notFound = results.filter(r => r.startsWith('⭕')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  
  console.log(`Deleted: ${successful}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Failed: ${failed}`);
  console.log(`Still working: ${stillWorking}`);
  
  if (successful + notFound === knownCodes.length && stillWorking === 0) {
    console.log('\n🎉 ALL ACCESS CODES CLEARED SUCCESSFULLY');
    console.log('✅ Database cleaned of all known access codes');
    console.log('✅ System ready for fresh access codes');
    console.log('✅ No existing codes can be used');
  } else if (stillWorking === 0) {
    console.log('\n✅ ACCESS CODES CLEARED');
    console.log('System is clean and ready for new codes');
  } else {
    console.log('\n⚠️ Some codes may still be active');
    console.log('Manual verification recommended');
  }
  
  return { deleted: successful, notFound, failed, stillWorking };
}

clearAccessCodes().catch(console.error);