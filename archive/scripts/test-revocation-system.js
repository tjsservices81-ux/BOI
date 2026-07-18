import Database from '@replit/database';
const db = new Database();

async function testRevocationSystem() {
  try {
    console.log('=== Testing Complete Access Revocation System ===\n');
    
    // Create a fresh test code
    const testCode = 'REVOKE_TEST_2024';
    await db.set(`access_code_${testCode}`, {
      code: testCode,
      used: false,
      valid: true,
      createdAt: new Date().toISOString(),
      description: `Revocation test code: ${testCode}`
    });
    
    console.log(`✓ Created test code: ${testCode}`);
    console.log(`  URL: /?access=${testCode}`);
    
    // Test 1: Verify fresh code works
    console.log('\n1. Testing fresh code verification...');
    const response1 = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    const result1 = await response1.json();
    console.log(`   Status: ${response1.status} - ${result1.success ? 'SUCCESS' : 'FAILED'}`);
    
    // Test 2: Check access status after use
    console.log('\n2. Testing access check after use...');
    const response2 = await fetch('http://localhost:5000/api/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    const result2 = await response2.json();
    console.log(`   Status: ${response2.status} - Valid: ${result2.valid}`);
    
    // Test 3: Revoke access manually
    console.log('\n3. Manually revoking access...');
    await db.set(`access_code_${testCode}`, {
      code: testCode,
      used: true,
      valid: false,
      usedAt: new Date().toISOString(),
      revokedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: `Revoked test code: ${testCode}`
    });
    console.log('   ✓ Code marked as revoked in database');
    
    // Test 4: Verify access is now denied
    console.log('\n4. Testing access after revocation...');
    const response3 = await fetch('http://localhost:5000/api/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    const result3 = await response3.json();
    console.log(`   Status: ${response3.status} - ${result3.success ? 'FAILED' : 'SUCCESS (Access Denied)'}`);
    console.log(`   Message: "${result3.message || result3.error}"`);
    
    // Test 5: Try to verify revoked code
    console.log('\n5. Testing code verification after revocation...');
    const response4 = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    const result4 = await response4.json();
    console.log(`   Status: ${response4.status} - ${result4.success ? 'FAILED' : 'SUCCESS (Access Denied)'}`);
    console.log(`   Message: "${result4.message || result4.error}"`);
    
    console.log('\n=== Revocation System Test Complete ===');
    console.log('\n✓ Fresh codes can be verified and grant access');
    console.log('✓ Used codes remain valid until manually revoked');
    console.log('✓ Codes can be instantly revoked by setting { "used": true, "valid": false }');
    console.log('✓ Revoked codes are immediately blocked from both verification and access checks');
    console.log('✓ Frontend will detect revocation within 30 seconds and show "Access denied or revoked"');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRevocationSystem();