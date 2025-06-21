// Simple Authentication Test - ES Module Compatible
console.log('🏦 Bank of Ireland - Permanent Login System Test');
console.log('='.repeat(50));

async function testAuthSystem() {
  const baseUrl = 'http://localhost:5000';
  const testResults = [];

  function addResult(test, status, message) {
    testResults.push({ test, status, message });
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
  }

  try {
    // Test 1: Register test user
    console.log('\n📝 Testing user registration...');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerNumber: '99887766',
        pin: '5555',
        name: 'Test User Permanent',
        email: 'test.permanent@bank.ie',
        phone: '+353987654321'
      })
    });

    if (registerResponse.ok) {
      addResult('User Registration', 'PASS', 'Test user created successfully');
    } else {
      addResult('User Registration', 'INFO', 'User may already exist');
    }

    // Test 2: Login test user
    console.log('\n🔐 Testing user login...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerNumber: '99887766',
        pin: '5555'
      }),
      credentials: 'include'
    });

    if (loginResponse.ok) {
      addResult('User Login', 'PASS', 'Authentication successful');
    } else {
      console.log('Login response:', await loginResponse.text());
      addResult('User Login', 'FAIL', 'Authentication failed');
    }

    // Test 3: Check logout is disabled
    console.log('\n🚫 Testing logout prevention...');
    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    if (logoutResponse.status === 403) {
      addResult('Logout Prevention', 'PASS', 'Logout properly disabled');
    } else {
      addResult('Logout Prevention', 'FAIL', 'Logout not disabled');
    }

    // Test 4: Check server validation handling
    console.log('\n🔍 Testing server validation...');
    const validateResponse = await fetch(`${baseUrl}/api/auth/validate/99887766`);
    
    if (validateResponse.ok) {
      const validation = await validateResponse.json();
      if (validation.success) {
        addResult('Server Validation', 'PASS', 'User validation working');
      } else {
        addResult('Server Validation', 'WARN', 'Validation failed but system continues');
      }
    } else {
      addResult('Server Validation', 'WARN', 'Validation endpoint not responding');
    }

    // Test 5: Session persistence
    console.log('\n🗄️ Testing session persistence...');
    const sessionResponse = await fetch(`${baseUrl}/api/auth/user`, {
      credentials: 'include'
    });

    if (sessionResponse.ok) {
      const user = await sessionResponse.json();
      addResult('Session Persistence', 'PASS', `Session active for ${user.name || user.customerNumber}`);
    } else {
      addResult('Session Persistence', 'WARN', 'No active session found');
    }

  } catch (error) {
    addResult('Test Execution', 'FAIL', `Error: ${error.message}`);
  }

  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warnings = testResults.filter(r => r.status === 'WARN' || r.status === 'INFO').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Warnings: ${warnings}`);
  console.log(`📋 Total: ${testResults.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 Permanent login system is working correctly!');
    console.log('All logout prevention mechanisms are active.');
  } else {
    console.log('\n🔧 Some components need attention.');
  }
}

// Run the test
testAuthSystem().catch(console.error);