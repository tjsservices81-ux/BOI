async function testFrontendAndPWA() {
  console.log('🖥️ FRONTEND & PWA FUNCTIONALITY TEST\n');
  
  const results = [];
  
  // Test main application endpoints
  console.log('📱 Testing Core Application Routes:');
  
  const routes = [
    { path: '/', desc: 'Home page' },
    { path: '/dashboard', desc: 'Dashboard' },
    { path: '/uk-transfer', desc: 'Transfer page' },
    { path: '/profile', desc: 'Profile page' }
  ];
  
  for (const route of routes) {
    try {
      const response = await fetch(`http://localhost:5000${route.path}`);
      if (response.status === 200) {
        console.log(`  ✅ ${route.desc}: Responding (${response.status})`);
        results.push(`✅ Route ${route.path}: Working`);
      } else {
        console.log(`  ⚠️  ${route.desc}: Status ${response.status}`);
        results.push(`⚠️ Route ${route.path}: Status ${response.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${route.desc}: Failed to load`);
      results.push(`❌ Route ${route.path}: Failed`);
    }
  }
  
  // Test static assets
  console.log('\n🎨 Testing Static Assets:');
  
  const assets = [
    '/boi_app_icon.png',
    '/sw.js',
    '/manifest.json'
  ];
  
  for (const asset of assets) {
    try {
      const response = await fetch(`http://localhost:5000${asset}`);
      if (response.status === 200) {
        console.log(`  ✅ ${asset}: Available`);
        results.push(`✅ Asset ${asset}: Available`);
      } else {
        console.log(`  ❌ ${asset}: Status ${response.status}`);
        results.push(`❌ Asset ${asset}: Status ${response.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${asset}: Failed to load`);
      results.push(`❌ Asset ${asset}: Failed`);
    }
  }
  
  // Test API endpoints
  console.log('\n🔗 Testing API Endpoints:');
  
  const apiEndpoints = [
    { path: '/api/health', method: 'GET', desc: 'Health check' },
    { path: '/api/check-access', method: 'POST', desc: 'Access validation', body: { code: 'test' } }
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      const options = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(`http://localhost:5000${endpoint.path}`, options);
      console.log(`  ✅ ${endpoint.desc}: Status ${response.status}`);
      results.push(`✅ API ${endpoint.path}: Working`);
    } catch (e) {
      console.log(`  ❌ ${endpoint.desc}: Failed`);
      results.push(`❌ API ${endpoint.path}: Failed`);
    }
  }
  
  // Test PWA manifest variations
  console.log('\n📋 Testing PWA Manifest Variations:');
  
  const manifestTests = [
    { url: '/manifest.json', desc: 'Default manifest' },
    { url: '/manifest.json?access=BOI729889', desc: 'Manifest with access code' },
    { url: '/manifest.json?access=invalid', desc: 'Manifest with invalid code' }
  ];
  
  for (const test of manifestTests) {
    try {
      const response = await fetch(`http://localhost:5000${test.url}`);
      const manifest = await response.json();
      
      if (manifest.name && manifest.start_url) {
        console.log(`  ✅ ${test.desc}: Valid manifest structure`);
        results.push(`✅ Manifest ${test.url}: Valid`);
      } else {
        console.log(`  ❌ ${test.desc}: Invalid manifest structure`);
        results.push(`❌ Manifest ${test.url}: Invalid`);
      }
    } catch (e) {
      console.log(`  ❌ ${test.desc}: Failed to parse`);
      results.push(`❌ Manifest ${test.url}: Failed`);
    }
  }
  
  console.log('\n📊 Frontend & PWA Test Summary:');
  console.log('='.repeat(40));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nResult: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All frontend and PWA systems operational');
  } else {
    console.log('⚠️ Some issues detected in frontend/PWA');
  }
  
  return { passed, total, results };
}

testFrontendAndPWA().catch(console.error);