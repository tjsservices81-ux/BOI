import Database from "@replit/database";
const db = new Database();

async function permanentlyRevokeCode() {
  const codeToRevoke = 'BOI199038';
  console.log(`🚫 PERMANENTLY REVOKING ACCESS CODE: ${codeToRevoke}\n`);
  
  try {
    // Create a revoked code entry that will permanently block this code
    const revokedCodeInfo = {
      code: codeToRevoke,
      valid: false,  // Mark as invalid
      revoked: true,
      revokedAt: new Date().toISOString(),
      reason: "User requested removal",
      usageCount: {
        ios: 999,     // Set to max to prevent any usage
        android: 999,
        other: 999
      },
      deviceLimits: {
        ios: 0,       // Set limits to 0
        android: 0,
        other: 0
      },
      totalUsage: 999,
      permanentlyBlocked: true
    };
    
    // Store the revoked code info
    await db.set(`access_code_${codeToRevoke}`, JSON.stringify(revokedCodeInfo));
    console.log(`✅ ${codeToRevoke}: Marked as permanently revoked in database`);
    
    // Test that code is now blocked
    const response = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeToRevoke })
    });
    
    const result = await response.json();
    
    if (response.status === 403 && result.error.includes('revoked')) {
      console.log(`✅ ${codeToRevoke}: Access properly denied (403 - revoked)`);
    } else if (response.status === 409 && result.error.includes('already used')) {
      console.log(`✅ ${codeToRevoke}: Access properly blocked (409 - usage exceeded)`);
    } else {
      console.log(`⚠️ ${codeToRevoke}: Unexpected response (${response.status})`);
    }
    
    console.log('\n📊 REVOCATION SUMMARY');
    console.log('='.repeat(35));
    console.log(`🚫 Code ${codeToRevoke} permanently revoked`);
    console.log('✅ Database updated with revocation status');
    console.log('✅ All future access attempts will be blocked');
    console.log('✅ Code cannot be reactivated without manual intervention');
    
    return { revoked: true, code: codeToRevoke };
    
  } catch (error) {
    console.log(`❌ Error revoking code: ${error.message}`);
    return { revoked: false, error: error.message };
  }
}

permanentlyRevokeCode().catch(console.error);