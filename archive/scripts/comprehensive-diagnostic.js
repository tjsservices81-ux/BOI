import Database from '@replit/database';
const db = new Database();

async function runComprehensiveDiagnostic() {
  console.log('🔍 COMPREHENSIVE APPLICATION DIAGNOSTIC SCAN\n');
  
  const results = {
    backend: [],
    frontend: [],
    manifest: [],
    accessControl: [],
    userSessions: [],
    dataIntegrity: [],
    pwaFunctionality: []
  };

  // 1. Backend Health Check
  console.log('🔧 BACKEND SYSTEMS CHECK:');
  try {
    const healthResponse = await fetch('http://localhost:5000/api/health');
    const healthData = await healthResponse.json();
    if (healthData.status === 'ok') {
      results.backend.push('✅ Server responding correctly');
      console.log('  ✅ API Health: OK');
    } else {
      results.backend.push('❌ Server health check failed');
      console.log('  ❌ API Health: FAILED');
    }
  } catch (e) {
    results.backend.push('❌ Server unreachable');
    console.log('  ❌ API Health: UNREACHABLE');
  }

  // 2. Access Code System (Device-Specific)
  console.log('\n🔐 ACCESS CODE SYSTEM CHECK:');
  const testCode = 'vip919';
  
  // Check fresh code creation
  const codeData = await db.get(`access_code_${testCode}`);
  if (codeData) {
    let parsedData;
    try {
      parsedData = typeof codeData.value === 'string' ? JSON.parse(codeData.value) : codeData.value;
      if (parsedData.usage && parsedData.usage.ios === 0 && parsedData.usage.nonIos === 0) {
        results.accessControl.push('✅ Fresh codes created with correct initial state');
        console.log('  ✅ Fresh Code Creation: OK');
      } else {
        results.accessControl.push('❌ Fresh codes not initializing correctly');
        console.log('  ❌ Fresh Code Creation: FAILED');
      }
    } catch (e) {
      results.accessControl.push('❌ Code data parsing failed');
      console.log('  ❌ Code Data Parsing: FAILED');
    }
  }

  // Test iOS device (2 uses allowed)
  console.log('\n📱 iOS DEVICE ACCESS TEST:');
  const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
  
  // First iOS use
  let response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': iosUA },
    body: JSON.stringify({ code: testCode })
  });
  let result = await response.json();
  
  if (result.success && result.deviceType === 'iOS' && result.remainingUses === 1) {
    results.accessControl.push('✅ iOS first use: Allowed correctly');
    console.log('  ✅ iOS Use 1: ALLOWED (1 remaining)');
  } else {
    results.accessControl.push('❌ iOS first use failed');
    console.log('  ❌ iOS Use 1: FAILED');
  }

  // Second iOS use
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': iosUA },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  
  if (result.success && result.remainingUses === 0) {
    results.accessControl.push('✅ iOS second use: Allowed correctly');
    console.log('  ✅ iOS Use 2: ALLOWED (0 remaining)');
  } else {
    results.accessControl.push('❌ iOS second use failed');
    console.log('  ❌ iOS Use 2: FAILED');
  }

  // Third iOS use (should be blocked)
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': iosUA },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  
  if (!result.success && result.error === 'Access Restricted – code already used') {
    results.accessControl.push('✅ iOS third use: Blocked correctly');
    console.log('  ✅ iOS Use 3: BLOCKED');
  } else {
    results.accessControl.push('❌ iOS third use not blocked');
    console.log('  ❌ iOS Use 3: NOT BLOCKED');
  }

  // Test non-iOS device (1 use allowed)
  console.log('\n💻 NON-iOS DEVICE ACCESS TEST:');
  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': chromeUA },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  
  if (result.success && result.deviceType === 'other' && result.remainingUses === 0) {
    results.accessControl.push('✅ Non-iOS first use: Allowed correctly');
    console.log('  ✅ Non-iOS Use 1: ALLOWED (0 remaining)');
  } else {
    results.accessControl.push('❌ Non-iOS first use failed');
    console.log('  ❌ Non-iOS Use 1: FAILED');
  }

  // Second non-iOS use (should be blocked)
  response = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': chromeUA },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  
  if (!result.success && result.error === 'Access Restricted – code already used') {
    results.accessControl.push('✅ Non-iOS second use: Blocked correctly');
    console.log('  ✅ Non-iOS Use 2: BLOCKED');
  } else {
    results.accessControl.push('❌ Non-iOS second use not blocked');
    console.log('  ❌ Non-iOS Use 2: NOT BLOCKED');
  }

  // 3. Manifest System Check
  console.log('\n📋 PWA MANIFEST SYSTEM CHECK:');
  
  // Test manifest without access code
  response = await fetch('http://localhost:5000/manifest.json');
  result = await response.json();
  if (result.start_url === '/') {
    results.manifest.push('✅ Default manifest: Correct start_url');
    console.log('  ✅ Default Manifest: OK');
  } else {
    results.manifest.push('❌ Default manifest: Wrong start_url');
    console.log('  ❌ Default Manifest: FAILED');
  }

  // Test manifest with access code
  response = await fetch(`http://localhost:5000/manifest.json?access=${testCode}`);
  result = await response.json();
  if (result.start_url === `/?access=${testCode}`) {
    results.manifest.push('✅ Dynamic manifest: Correct start_url with access code');
    console.log('  ✅ Dynamic Manifest: OK');
  } else {
    results.manifest.push('❌ Dynamic manifest: Wrong start_url');
    console.log('  ❌ Dynamic Manifest: FAILED');
  }

  // 4. Check-Access Endpoint
  console.log('\n🔍 ACCESS VALIDATION CHECK:');
  
  response = await fetch('http://localhost:5000/api/check-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': iosUA },
    body: JSON.stringify({ code: testCode })
  });
  result = await response.json();
  
  if (!result.success && result.error === 'Access Restricted – code already used') {
    results.accessControl.push('✅ Access validation: Correctly blocks exhausted codes');
    console.log('  ✅ Access Validation: OK');
  } else {
    results.accessControl.push('❌ Access validation: Not working correctly');
    console.log('  ❌ Access Validation: FAILED');
  }

  // 5. Legacy Code Compatibility Check
  console.log('\n🔄 LEGACY CODE COMPATIBILITY CHECK:');
  
  // Check if old codes still work with new system
  const oldCodes = ['BOI729889', 'vip542', 'vip223', 'vip153'];
  let legacyWorking = 0;
  
  for (const oldCode of oldCodes) {
    const oldData = await db.get(`access_code_${oldCode}`);
    if (oldData) {
      response = await fetch('http://localhost:5000/api/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oldCode })
      });
      
      if (response.status === 403 || response.status === 409) {
        legacyWorking++;
      }
    }
  }
  
  if (legacyWorking > 0) {
    results.accessControl.push('✅ Legacy codes: Compatible with new system');
    console.log(`  ✅ Legacy Compatibility: ${legacyWorking} codes tested OK`);
  } else {
    results.accessControl.push('❌ Legacy codes: Not compatible');
    console.log('  ❌ Legacy Compatibility: FAILED');
  }

  // 6. Database Integrity Check
  console.log('\n💾 DATABASE INTEGRITY CHECK:');
  
  try {
    const keys = await db.list();
    const accessCodes = keys.filter(key => key.startsWith('access_code_'));
    console.log(`  ✅ Database: ${accessCodes.length} access codes found`);
    results.dataIntegrity.push(`✅ Database contains ${accessCodes.length} access codes`);
  } catch (e) {
    console.log('  ❌ Database: Connection failed');
    results.dataIntegrity.push('❌ Database connection failed');
  }

  // SUMMARY
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('='.repeat(50));
  
  const categories = Object.keys(results);
  let totalTests = 0;
  let passedTests = 0;
  
  categories.forEach(category => {
    const tests = results[category];
    const passed = tests.filter(test => test.startsWith('✅')).length;
    const failed = tests.filter(test => test.startsWith('❌')).length;
    
    console.log(`\n${category.toUpperCase()}:`);
    tests.forEach(test => console.log(`  ${test}`));
    
    totalTests += tests.length;
    passedTests += passed;
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`OVERALL HEALTH: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL');
  } else {
    console.log('⚠️  ISSUES DETECTED - Review failed tests above');
  }
  
  return { results, summary: { total: totalTests, passed: passedTests } };
}

runComprehensiveDiagnostic().catch(console.error);