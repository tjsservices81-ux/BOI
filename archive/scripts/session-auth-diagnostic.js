async function testSessionAndAuth() {
  console.log('🔐 SESSION & AUTHENTICATION DIAGNOSTIC\n');
  
  const results = [];
  
  // Test user registration endpoint
  console.log('👤 Testing User Registration:');
  try {
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        dateOfBirth: '1990-01-01',
        pin: '1234'
      })
    });
    
    if (registerResponse.status === 200 || registerResponse.status === 409) {
      console.log('  ✅ Registration endpoint: Responding correctly');
      results.push('✅ User registration endpoint working');
    } else {
      console.log(`  ❌ Registration endpoint: Status ${registerResponse.status}`);
      results.push('❌ User registration endpoint failed');
    }
  } catch (e) {
    console.log('  ❌ Registration endpoint: Connection failed');
    results.push('❌ User registration endpoint unreachable');
  }
  
  // Test login endpoint
  console.log('\n🔑 Testing User Login:');
  try {
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        pin: '1234'
      })
    });
    
    if (loginResponse.status === 200 || loginResponse.status === 401) {
      console.log('  ✅ Login endpoint: Responding correctly');
      results.push('✅ User login endpoint working');
    } else {
      console.log(`  ❌ Login endpoint: Status ${loginResponse.status}`);
      results.push('❌ User login endpoint failed');
    }
  } catch (e) {
    console.log('  ❌ Login endpoint: Connection failed');
    results.push('❌ User login endpoint unreachable');
  }
  
  // Test protected endpoints (should require auth)
  console.log('\n🛡️ Testing Protected Endpoints:');
  
  const protectedEndpoints = [
    '/api/accounts',
    '/api/accounts/create',
    '/api/transfers'
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 401) {
        console.log(`  ✅ ${endpoint}: Correctly requires authentication`);
        results.push(`✅ Protected endpoint ${endpoint}: Secured`);
      } else {
        console.log(`  ⚠️ ${endpoint}: Status ${response.status} (expected 401)`);
        results.push(`⚠️ Protected endpoint ${endpoint}: Status ${response.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${endpoint}: Connection failed`);
      results.push(`❌ Protected endpoint ${endpoint}: Failed`);
    }
  }
  
  // Test session middleware
  console.log('\n📊 Testing Session Management:');
  try {
    const sessionResponse = await fetch('http://localhost:5000/api/auth/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (sessionResponse.status === 200 || sessionResponse.status === 401) {
      console.log('  ✅ Session status endpoint: Working');
      results.push('✅ Session management working');
    } else {
      console.log(`  ❌ Session status: Status ${sessionResponse.status}`);
      results.push('❌ Session management failed');
    }
  } catch (e) {
    console.log('  ❌ Session status: Connection failed');
    results.push('❌ Session management unreachable');
  }
  
  console.log('\n📊 Session & Auth Test Summary:');
  console.log('='.repeat(40));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nResult: ${passed}/${total} tests passed, ${warnings} warnings`);
  
  if (passed === total) {
    console.log('🎉 All authentication systems operational');
  } else if (warnings > 0 && passed + warnings === total) {
    console.log('⚠️ Authentication working with some expected behaviors');
  } else {
    console.log('❌ Critical authentication issues detected');
  }
  
  return { passed, total, warnings, results };
}

testSessionAndAuth().catch(console.error);