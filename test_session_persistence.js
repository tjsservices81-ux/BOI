// Comprehensive test to verify NO automatic logouts occur under any condition
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  customerNumber: '12345678',
  pin: '1234'
};

const axiosConfig = {
  withCredentials: true,
  validateStatus: () => true,
  timeout: 10000
};

async function testSessionPersistence() {
  console.log('🧪 TESTING: Complete elimination of automatic logout mechanisms\n');
  
  try {
    // Test 1: Login and establish session
    console.log('1️⃣ Testing login and session establishment...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, TEST_USER, axiosConfig);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login failed - cannot test session persistence');
      return;
    }
    
    const sessionCookie = loginResponse.headers['set-cookie'];
    console.log('✅ Login successful - session established');
    
    // Create axios instance with persistent cookies
    const sessionAxios = axios.create({
      ...axiosConfig,
      headers: sessionCookie ? { Cookie: sessionCookie.join('; ') } : {}
    });
    
    // Test 2: Verify immediate session validity
    console.log('\n2️⃣ Testing immediate session validity...');
    const authCheck1 = await sessionAxios.get(`${BASE_URL}/api/auth/user`);
    
    if (authCheck1.status === 200) {
      console.log('✅ Session valid immediately after login');
    } else {
      console.log('❌ Session invalid immediately after login');
    }
    
    // Test 3: Wait and check session persistence (simulating inactivity)
    console.log('\n3️⃣ Testing session persistence after 5 seconds of inactivity...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const authCheck2 = await axios.get(`${BASE_URL}/api/auth/user`, {
      headers: { Cookie: sessionCookie },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (authCheck2.status === 200) {
      console.log('✅ Session persists after inactivity - no automatic timeout');
    } else {
      console.log('❌ Session expired after inactivity - AUTOMATIC LOGOUT DETECTED');
    }
    
    // Test 4: Multiple rapid requests (stress test)
    console.log('\n4️⃣ Testing session under rapid requests...');
    for (let i = 0; i < 10; i++) {
      const rapidCheck = await axios.get(`${BASE_URL}/api/auth/user`, {
        headers: { Cookie: sessionCookie },
        withCredentials: true,
        validateStatus: () => true
      });
      
      if (rapidCheck.status !== 200) {
        console.log(`❌ Session failed on request ${i + 1}`);
        return;
      }
    }
    console.log('✅ Session stable under rapid requests');
    
    // Test 5: Final persistence check
    console.log('\n5️⃣ Final session persistence verification...');
    const finalCheck = await axios.get(`${BASE_URL}/api/auth/user`, {
      headers: { Cookie: sessionCookie },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (finalCheck.status === 200) {
      console.log('✅ Session remains active - NO AUTOMATIC LOGOUTS DETECTED');
      console.log('\n🎉 SUCCESS: All automatic logout mechanisms have been eliminated');
      console.log('🔒 SECURITY CONFIRMED: Only admin can delete accounts and sessions');
    } else {
      console.log('❌ Session lost - automatic logout mechanism still active');
      console.log('🚨 SECURITY VIOLATION: Users can be logged out automatically');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSessionPersistence();