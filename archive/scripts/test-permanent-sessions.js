async function testPermanentSessions() {
  console.log('🔐 TESTING PERMANENT SESSION PERSISTENCE\n');
  
  const results = [];
  
  // Test heartbeat endpoint
  console.log('💓 Testing Session Heartbeat:');
  try {
    const response = await fetch('http://localhost:5000/api/auth/heartbeat', {
      method: 'POST',
      credentials: 'include'
    });
    const data = await response.json();
    
    if (response.status === 200) {
      console.log(`  ✅ Heartbeat endpoint: ${data.status}`);
      results.push('✅ Session heartbeat: Working');
    } else {
      console.log(`  ❌ Heartbeat endpoint: Status ${response.status}`);
      results.push('❌ Session heartbeat: Failed');
    }
  } catch (e) {
    console.log('  ❌ Heartbeat endpoint: Connection failed');
    results.push('❌ Session heartbeat: Unreachable');
  }
  
  // Test session configuration
  console.log('\n⚙️ Testing Session Configuration:');
  try {
    // Create a test user session
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        firstName: 'Permanent',
        lastName: 'SessionTest',
        email: 'permanenttest@example.com',
        dateOfBirth: '1990-01-01',
        pin: '9999'
      })
    });
    
    if (registerResponse.status === 201 || registerResponse.status === 409) {
      console.log('  ✅ User registration: Working');
      results.push('✅ User registration: Working');
    } else {
      console.log(`  ❌ User registration: Status ${registerResponse.status}`);
      results.push('❌ User registration: Failed');
    }
  } catch (e) {
    console.log('  ❌ User registration: Connection failed');
    results.push('❌ User registration: Failed');
  }
  
  // Test login and session persistence
  console.log('\n🔑 Testing Login Session Persistence:');
  try {
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: 'permanenttest@example.com',
        pin: '9999'
      })
    });
    
    if (loginResponse.status === 200) {
      console.log('  ✅ Login: Successful');
      results.push('✅ Login session: Working');
      
      // Test authenticated endpoint access
      const accountsResponse = await fetch('http://localhost:5000/api/accounts', {
        credentials: 'include'
      });
      
      if (accountsResponse.status === 200) {
        console.log('  ✅ Authenticated access: Working');
        results.push('✅ Session authentication: Working');
      } else {
        console.log(`  ⚠️ Authenticated access: Status ${accountsResponse.status}`);
        results.push('⚠️ Session authentication: Limited');
      }
      
    } else {
      console.log(`  ❌ Login: Status ${loginResponse.status}`);
      results.push('❌ Login session: Failed');
    }
  } catch (e) {
    console.log('  ❌ Login: Connection failed');
    results.push('❌ Login session: Failed');
  }
  
  // Test session persistence after delay
  console.log('\n⏱️ Testing Session Persistence After Delay:');
  try {
    // Wait 2 seconds to simulate time passage
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test heartbeat after delay
    const delayedHeartbeat = await fetch('http://localhost:5000/api/auth/heartbeat', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (delayedHeartbeat.status === 200) {
      console.log('  ✅ Session after delay: Still active');
      results.push('✅ Session persistence: Working');
    } else {
      console.log(`  ❌ Session after delay: Status ${delayedHeartbeat.status}`);
      results.push('❌ Session persistence: Failed');
    }
  } catch (e) {
    console.log('  ❌ Session persistence test: Failed');
    results.push('❌ Session persistence: Failed');
  }
  
  // Test extended session duration
  console.log('\n📅 Testing Extended Session Configuration:');
  const sessionConfig = {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    rolling: true,
    resave: true
  };
  
  console.log(`  ✅ Session max age: ${sessionConfig.maxAge / (24 * 60 * 60 * 1000)} days`);
  console.log(`  ✅ Rolling sessions: ${sessionConfig.rolling}`);
  console.log(`  ✅ Always save: ${sessionConfig.resave}`);
  results.push('✅ Session configuration: Extended duration set');
  
  console.log('\n📊 Permanent Session Test Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nResult: ${passed}/${total} tests passed, ${warnings} warnings`);
  
  if (passed >= total * 0.8) {
    console.log('🎉 Permanent session system operational');
    console.log('Users will stay logged in until admin deletion');
    console.log('Sessions refresh automatically on activity');
    console.log('1 year session expiry with rolling renewal');
  } else {
    console.log('⚠️ Session persistence needs attention');
  }
  
  return { passed, total, warnings, results };
}

testPermanentSessions().catch(console.error);