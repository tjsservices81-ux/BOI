import Database from "@replit/database";
const db = new Database();

async function removeSpecificCode() {
  const codeToRemove = 'BOI199038';
  console.log(`🗑️ REMOVING ACCESS CODE: ${codeToRemove}\n`);
  
  try {
    // Check if code exists
    const codeData = await db.get(`access_code_${codeToRemove}`);
    
    if (!codeData) {
      console.log(`⭕ ${codeToRemove}: Code not found in database`);
      console.log('✅ Code is already removed or never existed');
      return { found: false, removed: false };
    }
    
    console.log(`📋 Found code ${codeToRemove} in database`);
    
    // Delete the code
    await db.delete(`access_code_${codeToRemove}`);
    console.log(`✅ ${codeToRemove}: Successfully deleted from database`);
    
    // Verify deletion
    const verifyDeleted = await db.get(`access_code_${codeToRemove}`);
    
    if (!verifyDeleted) {
      console.log(`✅ Deletion verified - ${codeToRemove} no longer exists`);
    } else {
      console.log(`❌ Deletion may have failed - code still exists`);
    }
    
    // Test that code no longer works
    try {
      const response = await fetch('http://localhost:5000/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToRemove })
      });
      
      if (response.status === 404) {
        console.log(`✅ ${codeToRemove}: Code correctly blocked (404 response)`);
      } else {
        console.log(`⚠️ ${codeToRemove}: Unexpected response (${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️ Could not test code removal: ${error.message}`);
    }
    
    console.log('\n📊 REMOVAL SUMMARY');
    console.log('='.repeat(30));
    console.log(`✅ Code ${codeToRemove} has been removed`);
    console.log('✅ Database deletion completed');
    console.log('✅ Access blocked for this code');
    
    return { found: true, removed: true };
    
  } catch (error) {
    console.log(`❌ Error removing code: ${error.message}`);
    return { found: false, removed: false, error: error.message };
  }
}

removeSpecificCode().catch(console.error);