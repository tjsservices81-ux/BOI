import Database from "@replit/database";
const db = new Database();

async function deleteAllAccessCodes() {
  console.log('🗑️ DELETING ALL ACCESS CODES\n');
  
  try {
    // Get all keys from the database
    const allKeys = await db.list("");
    console.log(`Found ${allKeys.length} total keys in database`);
    
    // Filter for access code keys
    const accessCodeKeys = allKeys.filter(key => key.startsWith('access_code_'));
    console.log(`Found ${accessCodeKeys.length} access code keys to delete`);
    
    if (accessCodeKeys.length === 0) {
      console.log('✅ No access codes found - database already clean');
      return { deleted: 0, total: 0 };
    }
    
    console.log('\n📋 Access codes to be deleted:');
    accessCodeKeys.forEach((key, index) => {
      const code = key.replace('access_code_', '');
      console.log(`  ${index + 1}. ${code}`);
    });
    
    console.log('\n🗑️ Deleting access codes...');
    let deleted = 0;
    const results = [];
    
    for (const key of accessCodeKeys) {
      try {
        await db.delete(key);
        const code = key.replace('access_code_', '');
        console.log(`  ✅ ${code}: Deleted successfully`);
        results.push(`✅ ${code}: Deleted`);
        deleted++;
      } catch (error) {
        const code = key.replace('access_code_', '');
        console.log(`  ❌ ${code}: Delete failed - ${error.message}`);
        results.push(`❌ ${code}: Failed`);
      }
    }
    
    // Verify deletion by checking remaining keys
    console.log('\n🔍 Verifying deletion...');
    const remainingKeys = await db.list("");
    const remainingAccessCodes = remainingKeys.filter(key => key.startsWith('access_code_'));
    
    console.log('\n📊 DELETION SUMMARY');
    console.log('='.repeat(40));
    results.forEach(result => console.log(`  ${result}`));
    
    console.log(`\nDeletion Score: ${deleted}/${accessCodeKeys.length} codes deleted`);
    console.log(`Remaining access codes: ${remainingAccessCodes.length}`);
    
    if (remainingAccessCodes.length === 0) {
      console.log('\n🎉 ALL ACCESS CODES DELETED SUCCESSFULLY');
      console.log('✅ Database cleaned of all access codes');
      console.log('✅ System ready for fresh access codes');
      console.log('✅ No existing codes can be used');
    } else {
      console.log('\n⚠️ Some access codes may remain');
      console.log('Manual verification recommended');
    }
    
    return { deleted, total: accessCodeKeys.length, remaining: remainingAccessCodes.length };
    
  } catch (error) {
    console.error('❌ Error during deletion process:', error.message);
    return { deleted: 0, total: 0, error: error.message };
  }
}

deleteAllAccessCodes().catch(console.error);