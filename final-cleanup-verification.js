import Database from '@replit/database';
const db = new Database();

async function finalCleanupVerification() {
  console.log('🔬 FINAL CLEANUP & VERIFICATION\n');
  
  // Check what's actually in the database
  console.log('📋 Database Contents:');
  try {
    const allKeys = await db.list();
    const keyArray = Array.isArray(allKeys) ? allKeys : Object.keys(allKeys || {});
    
    console.log(`Total keys in database: ${keyArray.length}`);
    
    if (keyArray.length > 0) {
      console.log('Current keys:');
      for (const key of keyArray) {
        const value = await db.get(key);
        console.log(`  - ${key}: ${JSON.stringify(value).substring(0, 100)}...`);
      }
    } else {
      console.log('✅ Database is completely empty');
    }
    
  } catch (error) {
    console.log(`Error checking database: ${error.message}`);
  }
  
  // Test specific codes that should be deleted
  console.log('\n🔍 Testing Specific Code Deletion:');
  const testCodes = ['BOI729889', 'DEMO2024', 'TEST123'];
  
  for (const code of testCodes) {
    try {
      const exists = await db.get(`access_code_${code}`);
      if (exists) {
        console.log(`❌ Code ${code} still exists: ${JSON.stringify(exists)}`);
        // Delete it now
        await db.delete(`access_code_${code}`);
        console.log(`✅ Manually deleted ${code}`);
      } else {
        console.log(`✅ Code ${code} confirmed deleted`);
      }
    } catch (error) {
      console.log(`✅ Code ${code} not found (good)`);
    }
  }
  
  // Clear entire database
  console.log('\n🧹 Complete Database Wipe:');
  try {
    const allKeys = await db.list();
    const keyArray = Array.isArray(allKeys) ? allKeys : Object.keys(allKeys || {});
    
    for (const key of keyArray) {
      await db.delete(key);
      console.log(`✅ Deleted: ${key}`);
    }
    
    console.log(`✅ Deleted ${keyArray.length} total keys`);
    
  } catch (error) {
    console.log(`Error wiping database: ${error.message}`);
  }
  
  // Final verification
  console.log('\n✅ Final Verification:');
  try {
    const allKeys = await db.list();
    const keyArray = Array.isArray(allKeys) ? allKeys : Object.keys(allKeys || {});
    
    if (keyArray.length === 0) {
      console.log('🎉 Database is completely empty');
    } else {
      console.log(`⚠️ ${keyArray.length} keys still remain`);
    }
    
  } catch (error) {
    console.log(`Error in final verification: ${error.message}`);
  }
  
  // Test access validation now
  console.log('\n🔐 Testing Access Validation After Cleanup:');
  try {
    const response = await fetch('http://localhost:5000/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BOI729889' })
    });
    
    const result = await response.json();
    console.log(`Response: ${response.status} - ${JSON.stringify(result)}`);
    
    if (response.status === 404 && result.error === 'Access code not found') {
      console.log('✅ Access code validation correctly returns 404');
    } else {
      console.log('❌ Access code validation not working as expected');
    }
    
  } catch (error) {
    console.log(`Error testing validation: ${error.message}`);
  }
}

finalCleanupVerification().catch(console.error);