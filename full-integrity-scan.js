import Database from '@replit/database';
const db = new Database();

async function fullIntegrityScan() {
  console.log('🔍 FULL APP INTEGRITY SCAN - POST ACCESS CODE INJECTION');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };
  
  function addResult(test, status, message, details = '') {
    results.tests.push({ test, status, message, details });
    if (status === 'PASS') results.passed++;
    else if (status === 'FAIL') results.failed++;
    else results.warnings++;
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
    if (details) console.log(`   Details: ${details}`);
  }
  
  try {
    console.log('\n📱 PWA & MANIFEST INTEGRITY');
    console.log('-'.repeat(30));
    
    // Test 1: Dynamic manifest generation
    const response1 = await fetch('http://localhost:5000/');
    if (response1.ok) {
      const html = await response1.text();
      if (html.includes('generateDynamicManifest')) {
        addResult('Dynamic Manifest Function', 'PASS', 'Function properly injected in HTML');
      } else {
        addResult('Dynamic Manifest Function', 'FAIL', 'Function missing from HTML');
      }
    }
    
    // Test 2: Access code system
    console.log('\n🔐 ACCESS CONTROL SYSTEM');
    console.log('-'.repeat(30));
    
    // Create fresh test code
    const testCode = `INTEGRITY_${Date.now()}`;
    await db.set(`access_code_${testCode}`, {
      code: testCode,
      used: false,
      valid: true,
      createdAt: new Date().toISOString(),
      description: `Integrity test: ${testCode}`
    });
    
    // Test fresh code verification
    const verifyResponse = await fetch('http://localhost:5000/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    
    if (verifyResponse.ok) {
      const result = await verifyResponse.json();
      if (result.success) {
        addResult('Fresh Code Verification', 'PASS', 'New codes verify successfully');
      } else {
        addResult('Fresh Code Verification', 'FAIL', 'New code verification failed');
      }
    }
    
    // Test 3: Access revocation system
    await db.set(`access_code_${testCode}`, {
      code: testCode,
      used: true,
      valid: false,
      revokedAt: new Date().toISOString()
    });
    
    const revokeCheckResponse = await fetch('http://localhost:5000/api/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode })
    });
    
    if (revokeCheckResponse.status === 403) {
      const revokeResult = await revokeCheckResponse.json();
      if (revokeResult.error === "Access denied or revoked") {
        addResult('Access Revocation', 'PASS', 'Revocation system working correctly');
      } else {
        addResult('Access Revocation', 'WARN', 'Revocation works but message unclear');
      }
    } else {
      addResult('Access Revocation', 'FAIL', 'Revocation system not working');
    }
    
    // Test 4: Backend functionality
    console.log('\n🔧 BACKEND INTEGRITY');
    console.log('-'.repeat(30));
    
    const healthResponse = await fetch('http://localhost:5000/api/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      if (health.status === 'ok') {
        addResult('Server Health', 'PASS', 'Backend responding normally');
      } else {
        addResult('Server Health', 'WARN', 'Server responding but status unclear');
      }
    } else {
      addResult('Server Health', 'FAIL', 'Server not responding to health checks');
    }
    
    // Test 5: Authentication system
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerNumber: '12345678', pin: '1234' })
    });
    
    if (loginResponse.ok) {
      addResult('Login Endpoint', 'PASS', 'Authentication system functional');
    } else {
      addResult('Login Endpoint', 'WARN', 'Login endpoint responding (expected for invalid creds)');
    }
    
    // Test 6: Admin panel access
    const adminResponse = await fetch('http://localhost:5000/admin/login');
    if (adminResponse.ok) {
      const adminHtml = await adminResponse.text();
      if (adminHtml.includes('Admin')) {
        addResult('Admin Panel', 'PASS', 'Admin panel accessible');
      } else {
        addResult('Admin Panel', 'WARN', 'Admin panel responding but content unclear');
      }
    } else {
      addResult('Admin Panel', 'FAIL', 'Admin panel not accessible');
    }
    
    // Test 7: Static assets
    console.log('\n📦 ASSET INTEGRITY');
    console.log('-'.repeat(30));
    
    const assetTests = [
      '/manifest.json',
      '/boi_app_icon.png',
      '/icon-192.svg',
      '/icon-512.svg',
      '/sw.js'
    ];
    
    for (const asset of assetTests) {
      try {
        const assetResponse = await fetch(`http://localhost:5000${asset}`);
        if (assetResponse.ok) {
          addResult(`Asset ${asset}`, 'PASS', 'Asset loading correctly');
        } else {
          addResult(`Asset ${asset}`, 'WARN', `Asset returned ${assetResponse.status}`);
        }
      } catch (error) {
        addResult(`Asset ${asset}`, 'FAIL', `Asset failed to load: ${error.message}`);
      }
    }
    
    // Test 8: Database connectivity
    console.log('\n💾 DATABASE INTEGRITY');
    console.log('-'.repeat(30));
    
    try {
      const testData = await db.get(`access_code_${testCode}`);
      if (testData && testData.value) {
        addResult('Database Access', 'PASS', 'Replit Database functioning');
      } else {
        addResult('Database Access', 'WARN', 'Database access unclear');
      }
    } catch (error) {
      addResult('Database Access', 'FAIL', `Database error: ${error.message}`);
    }
    
    // Performance check
    console.log('\n⚡ PERFORMANCE CHECK');
    console.log('-'.repeat(30));
    
    const start = Date.now();
    const perfResponse = await fetch('http://localhost:5000/');
    const loadTime = Date.now() - start;
    
    if (loadTime < 500) {
      addResult('Page Load Speed', 'PASS', `Fast load time: ${loadTime}ms`);
    } else if (loadTime < 1000) {
      addResult('Page Load Speed', 'WARN', `Acceptable load time: ${loadTime}ms`);
    } else {
      addResult('Page Load Speed', 'FAIL', `Slow load time: ${loadTime}ms`);
    }
    
  } catch (error) {
    addResult('Scan Execution', 'FAIL', `Scan failed: ${error.message}`);
  }
  
  // Final report
  console.log('\n📊 INTEGRITY SCAN RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`📋 Total Tests: ${results.tests.length}`);
  
  const successRate = Math.round((results.passed / results.tests.length) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (results.failed === 0 && results.warnings <= 2) {
    console.log('\n🎉 APP INTEGRITY: EXCELLENT');
    console.log('All critical systems functioning normally after access code injection.');
  } else if (results.failed <= 1) {
    console.log('\n👍 APP INTEGRITY: GOOD');
    console.log('Minor issues detected but core functionality intact.');
  } else {
    console.log('\n⚠️ APP INTEGRITY: NEEDS ATTENTION');
    console.log('Multiple issues detected requiring investigation.');
  }
  
  return results;
}

fullIntegrityScan().catch(console.error);