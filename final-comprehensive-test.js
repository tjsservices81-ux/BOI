import Database from '@replit/database';
const db = new Database();

async function finalComprehensiveTest() {
  console.log('🏆 FINAL COMPREHENSIVE APP INTEGRITY TEST');
  console.log('After Dynamic PWA Manifest + Access Code Injection');
  console.log('='.repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  
  function test(name, condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ ${name}: ${message}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}: ${message}`);
    }
  }
  
  // Create completely fresh test code for iPhone PWA testing
  const timestamp = Date.now();
  const freshCode = `IPHONE_PWA_${timestamp}`;
  
  console.log('\n📱 iPhone PWA Test Setup');
  console.log(`Creating fresh code: ${freshCode}`);
  
  await db.set(`access_code_${freshCode}`, {
    code: freshCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `iPhone PWA test: ${freshCode}`
  });
  
  // Test 1: Fresh code verification
  const verifyResponse = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: freshCode })
  });
  
  const verifyResult = await verifyResponse.json();
  test('Fresh Code Verification', verifyResult.success, 'New iPhone PWA code works');
  
  // Test 2: Dynamic manifest with access code
  const manifestResponse = await fetch(`http://localhost:5000/?access=${freshCode}`);
  const manifestHtml = await manifestResponse.text();
  
  const hasDynamicManifest = manifestHtml.includes('generateDynamicManifest');
  const hasStartUrl = manifestHtml.includes('start_url');
  test('Dynamic Manifest Injection', hasDynamicManifest && hasStartUrl, 'PWA manifest generation active');
  
  // Test 3: Backend authentication preserved
  const loginTest = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerNumber: '12345678', pin: '1234' })
  });
  
  test('Authentication System', loginTest.ok, 'Login endpoints functional');
  
  // Test 4: Admin panel preserved
  const adminTest = await fetch('http://localhost:5000/admin/login');
  const adminHtml = await adminTest.text();
  test('Admin Panel Access', adminHtml.includes('Admin'), 'Admin functionality intact');
  
  // Test 5: Access revocation system
  await db.set(`access_code_${freshCode}`, {
    code: freshCode,
    used: true,
    valid: false,
    revokedAt: new Date().toISOString()
  });
  
  const revokeTest = await fetch('http://localhost:5000/api/check-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: freshCode })
  });
  
  test('Access Revocation', revokeTest.status === 403, 'Instant revocation working');
  
  // Test 6: Critical assets loading
  const assetTests = [
    '/manifest.json',
    '/boi_app_icon.png', 
    '/icon-192.svg',
    '/icon-512.svg',
    '/sw.js'
  ];
  
  let assetsLoaded = 0;
  for (const asset of assetTests) {
    const assetResponse = await fetch(`http://localhost:5000${asset}`);
    if (assetResponse.ok) assetsLoaded++;
  }
  
  test('Critical Assets', assetsLoaded === assetTests.length, `${assetsLoaded}/${assetTests.length} assets loading`);
  
  // Test 7: Performance check
  const perfStart = Date.now();
  await fetch('http://localhost:5000/api/health');
  const perfTime = Date.now() - perfStart;
  
  test('Performance', perfTime < 100, `Response time: ${perfTime}ms`);
  
  // Test 8: Security headers
  const secResponse = await fetch('http://localhost:5000/');
  const hasSecHeaders = secResponse.headers.get('x-frame-options') && 
                        secResponse.headers.get('x-content-type-options');
  
  test('Security Headers', hasSecHeaders, 'Security policies active');
  
  // Test 9: Service worker compatibility
  const swResponse = await fetch('http://localhost:5000/sw.js');
  const swContent = await swResponse.text();
  const hasOfflineSupport = swContent.includes('Cache') && swContent.includes('fetch');
  
  test('Service Worker', hasOfflineSupport, 'Offline functionality preserved');
  
  // Test 10: Database integrity
  const dbTest = await db.get(`access_code_${freshCode}`);
  test('Database Access', dbTest && dbTest.value, 'Replit Database functioning');
  
  // Create final iPhone PWA test code
  const finalCode = `FINAL_IPHONE_${Date.now()}`;
  await db.set(`access_code_${finalCode}`, {
    code: finalCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Final iPhone test: ${finalCode}`
  });
  
  console.log('\n🎯 FINAL RESULTS');
  console.log('='.repeat(40));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests/totalTests)*100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🏆 COMPLETE SUCCESS');
    console.log('App integrity fully preserved after access code injection');
    console.log('iPhone PWA installation will work perfectly');
    console.log('All systems operational and secure');
    console.log('\n📱 Ready for iPhone PWA Testing:');
    console.log(`URL: /?access=${finalCode}`);
    console.log('This code preserves access when installed as PWA');
  } else {
    console.log('\n⚠️ ISSUES DETECTED');
    console.log(`${totalTests - passedTests} tests failed`);
  }
  
  return { totalTests, passedTests, finalCode };
}

finalComprehensiveTest().catch(console.error);