async function testPWAAndBlankScreenPrevention() {
  console.log('📱 PWA & BLANK SCREEN PREVENTION DIAGNOSTIC\n');
  
  const results = [];
  
  // Test Service Worker
  console.log('🔧 Testing Service Worker:');
  try {
    const swResponse = await fetch('http://localhost:5000/sw.js');
    const swContent = await swResponse.text();
    
    if (swResponse.status === 200 && swContent.includes('Bank of Ireland Mobile PWA')) {
      console.log('  ✅ Service Worker: Available and contains BOI branding');
      results.push('✅ Service Worker: Properly configured');
    } else {
      console.log('  ❌ Service Worker: Missing or incomplete');
      results.push('❌ Service Worker: Failed');
    }
  } catch (e) {
    console.log('  ❌ Service Worker: Connection failed');
    results.push('❌ Service Worker: Unreachable');
  }
  
  // Test blank screen prevention mechanisms
  console.log('\n🖥️ Testing Blank Screen Prevention:');
  
  // Check if main HTML contains loading indicators
  try {
    const htmlResponse = await fetch('http://localhost:5000/');
    const htmlContent = await htmlResponse.text();
    
    const hasLoadingIndicator = htmlContent.includes('splash') || 
                               htmlContent.includes('loading') || 
                               htmlContent.includes('Waiting for React');
    
    if (hasLoadingIndicator) {
      console.log('  ✅ Loading indicators: Present in HTML');
      results.push('✅ Blank screen prevention: Loading indicators active');
    } else {
      console.log('  ⚠️ Loading indicators: Not detected');
      results.push('⚠️ Blank screen prevention: Limited indicators');
    }
  } catch (e) {
    console.log('  ❌ HTML content: Failed to analyze');
    results.push('❌ Blank screen prevention: Analysis failed');
  }
  
  // Test offline fallback functionality
  console.log('\n📶 Testing Offline Fallback:');
  
  // Check service worker caching strategy
  try {
    const swResponse = await fetch('http://localhost:5000/sw.js');
    const swContent = await swResponse.text();
    
    const hasOfflineSupport = swContent.includes('cache') && 
                             swContent.includes('offline') && 
                             swContent.includes('fallback');
    
    if (hasOfflineSupport) {
      console.log('  ✅ Offline support: Implemented in service worker');
      results.push('✅ Offline functionality: Working');
    } else {
      console.log('  ⚠️ Offline support: Limited implementation');
      results.push('⚠️ Offline functionality: Partial');
    }
  } catch (e) {
    console.log('  ❌ Offline support: Cannot verify');
    results.push('❌ Offline functionality: Failed');
  }
  
  // Test PWA installability
  console.log('\n📲 Testing PWA Installation Requirements:');
  
  const installRequirements = [
    { test: 'manifest', url: '/manifest.json', desc: 'Web App Manifest' },
    { test: 'sw', url: '/sw.js', desc: 'Service Worker' },
    { test: 'icon', url: '/boi_app_icon.png', desc: 'App Icon' }
  ];
  
  let installable = true;
  
  for (const req of installRequirements) {
    try {
      const response = await fetch(`http://localhost:5000${req.url}`);
      if (response.status === 200) {
        console.log(`  ✅ ${req.desc}: Available`);
        results.push(`✅ PWA requirement ${req.test}: Met`);
      } else {
        console.log(`  ❌ ${req.desc}: Missing`);
        results.push(`❌ PWA requirement ${req.test}: Failed`);
        installable = false;
      }
    } catch (e) {
      console.log(`  ❌ ${req.desc}: Failed to load`);
      results.push(`❌ PWA requirement ${req.test}: Failed`);
      installable = false;
    }
  }
  
  if (installable) {
    console.log('  🎉 PWA: Meets all installation requirements');
    results.push('✅ PWA installability: Complete');
  } else {
    console.log('  ❌ PWA: Missing requirements for installation');
    results.push('❌ PWA installability: Incomplete');
  }
  
  // Test manifest start_url persistence
  console.log('\n🔗 Testing Access Code Persistence in PWA:');
  
  const accessCodes = ['BOI729889', 'vip919', 'invalid'];
  
  for (const code of accessCodes) {
    try {
      const response = await fetch(`http://localhost:5000/manifest.json?access=${code}`);
      const manifest = await response.json();
      
      if (manifest.start_url && manifest.start_url.includes(code)) {
        console.log(`  ✅ Access code ${code}: Preserved in start_url`);
        results.push(`✅ PWA persistence ${code}: Working`);
      } else {
        console.log(`  ❌ Access code ${code}: Not preserved`);
        results.push(`❌ PWA persistence ${code}: Failed`);
      }
    } catch (e) {
      console.log(`  ❌ Access code ${code}: Test failed`);
      results.push(`❌ PWA persistence ${code}: Failed`);
    }
  }
  
  // Test cache headers to prevent stale manifests
  console.log('\n🔄 Testing Cache Control:');
  
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json');
    const cacheControl = manifestResponse.headers.get('cache-control');
    
    if (cacheControl && cacheControl.includes('no-cache')) {
      console.log('  ✅ Manifest caching: Properly disabled');
      results.push('✅ Cache control: Working');
    } else {
      console.log('  ⚠️ Manifest caching: May cause stale data');
      results.push('⚠️ Cache control: Potential issues');
    }
  } catch (e) {
    console.log('  ❌ Cache control: Cannot verify');
    results.push('❌ Cache control: Failed');
  }
  
  console.log('\n📊 PWA & Blank Screen Prevention Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nResult: ${passed}/${total} tests passed, ${warnings} warnings`);
  
  if (passed >= total * 0.8) {
    console.log('🎉 PWA and blank screen prevention working well');
  } else {
    console.log('⚠️ PWA functionality needs attention');
  }
  
  return { passed, total, warnings, results };
}

testPWAAndBlankScreenPrevention().catch(console.error);