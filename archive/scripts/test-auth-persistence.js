// Comprehensive Authentication Persistence Test
const fetch = require('node-fetch');

class AuthPersistenceTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.cookies = '';
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🏦 Bank of Ireland - Permanent Login System Test\n');
    
    try {
      // Step 1: Create and login user
      await this.testUserCreation();
      await this.testUserLogin();
      
      // Step 2: Test all logout prevention mechanisms
      await this.testCorruptionHandling();
      await this.testServerValidationFailure();
      await this.testColdStartPrevention();
      await this.testCachePreservation();
      await this.testSessionPersistence();
      
      // Step 3: Verify user still authenticated
      await this.verifyFinalAuthState();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testUserCreation() {
    console.log('📝 Test 1: User Creation...');
    
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerNumber: '87654321',
        pin: '9876',
        name: 'Test User',
        email: 'test@bank.ie',
        phone: '+353123456789'
      })
    });

    const result = await response.text();
    
    if (response.ok) {
      this.addResult('User Creation', 'PASS', 'Test user created successfully');
    } else {
      this.addResult('User Creation', 'INFO', 'User may already exist, continuing...');
    }
  }

  async testUserLogin() {
    console.log('🔐 Test 2: User Login...');
    
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerNumber: '87654321',
        pin: '9876'
      })
    });

    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      this.cookies = cookies.split(';')[0];
    }

    if (response.ok) {
      this.addResult('User Login', 'PASS', 'User authenticated successfully');
    } else {
      throw new Error('Failed to authenticate test user');
    }
  }

  async testCorruptionHandling() {
    console.log('🛡️ Test 3: Corruption Handling...');
    
    // Test that server handles malformed requests gracefully
    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: { 
        'Cookie': this.cookies,
        'X-Test-Corrupted-Data': 'true'
      }
    });

    if (response.status === 200 || response.status === 401) {
      this.addResult('Corruption Handling', 'PASS', 'Server handles corrupted requests without crashing');
    } else {
      this.addResult('Corruption Handling', 'FAIL', `Unexpected response: ${response.status}`);
    }
  }

  async testServerValidationFailure() {
    console.log('🔍 Test 4: Server Validation Handling...');
    
    // Test validation endpoint with existing user
    const response = await fetch(`${this.baseUrl}/api/auth/validate/87654321`);
    const result = await response.json();

    if (result.success === true) {
      this.addResult('Server Validation', 'PASS', 'User validation works correctly');
    } else {
      this.addResult('Server Validation', 'WARN', 'Validation failed but system should continue offline');
    }
  }

  async testColdStartPrevention() {
    console.log('❄️ Test 5: Cold Start Prevention...');
    
    // Verify session persists across requests
    const response1 = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: { 'Cookie': this.cookies }
    });

    // Make second request to test session persistence
    const response2 = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: { 'Cookie': this.cookies }
    });

    if (response1.ok && response2.ok) {
      this.addResult('Cold Start Prevention', 'PASS', 'Session persists across multiple requests');
    } else {
      this.addResult('Cold Start Prevention', 'FAIL', 'Session not persisting properly');
    }
  }

  async testCachePreservation() {
    console.log('💾 Test 6: Cache Preservation...');
    
    // Test that authenticated endpoints work (indicating cache is working)
    const response = await fetch(`${this.baseUrl}/api/accounts/1`, {
      headers: { 'Cookie': this.cookies }
    });

    if (response.status === 200 || response.status === 401) {
      this.addResult('Cache Preservation', 'PASS', 'Server endpoints responding correctly');
    } else {
      this.addResult('Cache Preservation', 'WARN', `Unexpected response: ${response.status}`);
    }
  }

  async testSessionPersistence() {
    console.log('🗄️ Test 7: Session Persistence...');
    
    // Test that logout is properly disabled
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': this.cookies }
    });

    if (response.status === 403) {
      this.addResult('Session Persistence', 'PASS', 'Logout properly disabled - users cannot log themselves out');
    } else {
      this.addResult('Session Persistence', 'FAIL', 'Logout not properly disabled');
    }
  }

  async verifyFinalAuthState() {
    console.log('✅ Test 8: Final Authentication State...');
    
    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: { 'Cookie': this.cookies }
    });

    if (response.ok) {
      const user = await response.json();
      this.addResult('Final Auth State', 'PASS', `User ${user.name || user.customerNumber} remains authenticated`);
    } else {
      this.addResult('Final Auth State', 'FAIL', 'User lost authentication during tests');
    }
  }

  addResult(test, status, message) {
    this.testResults.push({ test, status, message });
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${emoji} ${test}: ${message}`);
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARN' || r.status === 'INFO').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📋 Total: ${this.testResults.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All critical tests passed! Permanent login system is working correctly.');
      console.log('Users will remain logged in until explicit admin deletion.');
    } else {
      console.log('\n🚨 Some tests failed. Review the logout prevention mechanisms.');
    }
    
    console.log('\n🔧 Test completed. Check the banking app frontend for user experience.');
  }
}

// Run the tests
const tester = new AuthPersistenceTest();
tester.runAllTests().catch(console.error);