#!/usr/bin/env node

// Test script to verify admin deletion functionality
import http from 'http';
import querystring from 'querystring';

const BASE_URL = 'http://localhost:5000';

async function makeRequest(method, path, data, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': method === 'POST' && path.includes('login') 
          ? 'application/x-www-form-urlencoded' 
          : 'application/json',
        'Cookie': cookies
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'];
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          cookies: setCookies ? setCookies.join('; ') : ''
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function testAdminDeletion() {
  console.log('🔧 Starting comprehensive admin deletion test...\n');

  try {
    // Step 1: Create test user
    console.log('1. Creating test user...');
    const createResponse = await makeRequest('POST', '/api/auth/register', {
      firstName: 'TestUser',
      lastName: 'ToDelete',
      email: 'testuser@delete.com',
      dateOfBirth: '1990-01-01',
      pin: '1234'
    });
    
    if (createResponse.statusCode === 200) {
      console.log('✅ Test user created successfully');
    } else {
      console.log('❌ Failed to create test user:', createResponse.statusCode);
      return;
    }

    // Step 2: Login to admin panel
    console.log('\n2. Logging into admin panel...');
    const loginResponse = await makeRequest('POST', '/admin/login', 
      querystring.stringify({ password: 'BOI_ADMIN_2025_SECURE' })
    );
    
    if (loginResponse.statusCode === 302) {
      console.log('✅ Admin login successful');
    } else {
      console.log('❌ Admin login failed:', loginResponse.statusCode);
      return;
    }

    const adminCookies = loginResponse.cookies;

    // Step 3: Check admin panel for users
    console.log('\n3. Checking admin panel for users...');
    const panelResponse = await makeRequest('GET', '/admin/panel', null, adminCookies);
    
    const customerNumberMatch = panelResponse.body.match(/BOI\d{9}/);
    if (customerNumberMatch) {
      const customerNumber = customerNumberMatch[0];
      console.log('✅ Found test user in admin panel:', customerNumber);

      // Step 4: Test user deletion
      console.log('\n4. Testing user deletion...');
      const deleteResponse = await makeRequest('POST', '/admin/delete-user', 
        { customerNumber: customerNumber }, 
        adminCookies
      );

      console.log('Delete response status:', deleteResponse.statusCode);
      console.log('Delete response body:', deleteResponse.body);

      if (deleteResponse.statusCode === 200) {
        const result = JSON.parse(deleteResponse.body);
        if (result.success) {
          console.log('✅ User deletion successful');
          console.log('   Details:', result.details);

          // Step 5: Verify user is gone from admin panel
          console.log('\n5. Verifying user removal from admin panel...');
          const verifyResponse = await makeRequest('GET', '/admin/panel', null, adminCookies);
          
          if (!verifyResponse.body.includes(customerNumber)) {
            console.log('✅ User successfully removed from admin panel');
          } else {
            console.log('❌ User still appears in admin panel');
          }

          // Step 6: Test login attempt with deleted user
          console.log('\n6. Testing login attempt with deleted user...');
          const loginAttempt = await makeRequest('POST', '/api/auth/login', {
            customerNumber: customerNumber,
            pin: '1234'
          });

          if (loginAttempt.statusCode !== 200 || loginAttempt.body.includes('error')) {
            console.log('✅ Deleted user cannot log in (as expected)');
          } else {
            console.log('❌ Deleted user can still log in - DELETION FAILED');
          }
        } else {
          console.log('❌ Deletion failed:', result.message);
        }
      } else {
        console.log('❌ Deletion request failed:', deleteResponse.statusCode);
      }
    } else {
      console.log('❌ No users found in admin panel');
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Admin deletion test complete');
}

testAdminDeletion();