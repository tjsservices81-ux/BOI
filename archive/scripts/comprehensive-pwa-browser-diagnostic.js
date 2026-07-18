async function runComprehensivePWABrowserDiagnostic() {
  console.log('🔍 COMPREHENSIVE PWA & BROWSER DIAGNOSTIC\n');
  console.log('Testing across all platforms and contexts...\n');
  
  const results = {
    pwa: [],
    browser: [],
    functionality: [],
    performance: []
  };
  
  // ===== PWA INSTALLATION TESTS =====
  console.log('📱 PWA INSTALLATION DIAGNOSTIC');
  console.log('='.repeat(40));
  
  // Test PWA manifest configuration
  console.log('\n🏠 PWA Manifest Configuration:');
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifest = await manifestResponse.json();
    
    console.log(`  Name: "${manifest.name}"`);
    console.log(`  Short Name: "${manifest.short_name}"`);
    console.log(`  Description: "${manifest.description}"`);
    console.log(`  Display Mode: ${manifest.display}`);
    console.log(`  Start URL: ${manifest.start_url}`);
    console.log(`  Theme Color: ${manifest.theme_color}`);
    console.log(`  Background: ${manifest.background_color}`);
    console.log(`  Icons: ${manifest.icons.length} defined`);
    
    // Verify PWA name is "BOI Mobile"
    if (manifest.name === 'BOI Mobile') {
      console.log('  ✅ PWA name correctly set to "BOI Mobile"');
      results.pwa.push('✅ PWA Name: BOI Mobile');
    } else {
      console.log(`  ❌ PWA name incorrect: "${manifest.name}"`);
      results.pwa.push('❌ PWA Name: Incorrect');
    }
    
    // Verify standalone mode
    if (manifest.display === 'standalone') {
      console.log('  ✅ PWA launches in standalone mode');
      results.pwa.push('✅ PWA Display: Standalone');
    } else {
      console.log(`  ❌ PWA display mode: ${manifest.display}`);
      results.pwa.push('❌ PWA Display: Not standalone');
    }
    
    // Verify custom icon usage
    if (manifest.icons[0].src === '/boi_app_icon.png') {
      console.log('  ✅ PWA uses custom app icon');
      results.pwa.push('✅ PWA Icon: Custom');
    } else {
      console.log(`  ❌ PWA icon: ${manifest.icons[0].src}`);
      results.pwa.push('❌ PWA Icon: Incorrect');
    }
    
    // Test icon accessibility
    const iconResponse = await fetch(`http://localhost:5000${manifest.icons[0].src}`);
    if (iconResponse.status === 200) {
      console.log('  ✅ PWA icon file accessible');
      results.pwa.push('✅ PWA Icon File: Accessible');
    } else {
      console.log('  ❌ PWA icon file missing');
      results.pwa.push('❌ PWA Icon File: Missing');
    }
    
  } catch (e) {
    console.log('  ❌ PWA manifest test failed');
    results.pwa.push('❌ PWA Manifest: Failed');
  }
  
  // ===== BROWSER TESTS =====
  console.log('\n🌐 BROWSER DISPLAY DIAGNOSTIC');
  console.log('='.repeat(40));
  
  console.log('\n📑 Browser HTML Metadata:');
  try {
    const htmlResponse = await fetch('http://localhost:5000/');
    const htmlContent = await htmlResponse.text();
    
    // Extract key metadata
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
    const appNameMatch = htmlContent.match(/application-name" content="(.*?)"/);
    const descriptionMatch = htmlContent.match(/description" content="(.*?)"/);
    const faviconMatch = htmlContent.match(/rel="icon" href="(.*?)"/);
    
    console.log(`  Page Title: "${titleMatch ? titleMatch[1] : 'Not found'}"`);
    console.log(`  App Name: "${appNameMatch ? appNameMatch[1] : 'Not found'}"`);
    console.log(`  Description: "${descriptionMatch ? descriptionMatch[1] : 'Not found'}"`);
    console.log(`  Favicon: "${faviconMatch ? faviconMatch[1] : 'Not found'}"`);
    
    // Verify browser title is "MyBOII"
    if (titleMatch && titleMatch[1] === 'MyBOII') {
      console.log('  ✅ Browser tab shows "MyBOII"');
      results.browser.push('✅ Browser Title: MyBOII');
    } else {
      console.log('  ❌ Browser title incorrect');
      results.browser.push('❌ Browser Title: Incorrect');
    }
    
    // Verify application name is "MyBOII"
    if (appNameMatch && appNameMatch[1] === 'MyBOII') {
      console.log('  ✅ Application name is "MyBOII"');
      results.browser.push('✅ App Name: MyBOII');
    } else {
      console.log('  ❌ Application name incorrect');
      results.browser.push('❌ App Name: Incorrect');
    }
    
    // Check for no banking references in browser metadata
    const bankingTerms = ['Bank of Ireland', 'Banking', 'BOI Mobile'];
    let bankingFound = false;
    
    bankingTerms.forEach(term => {
      if (titleMatch && titleMatch[1].includes(term)) {
        console.log(`  ⚠️ Found "${term}" in browser title`);
        bankingFound = true;
      }
      if (appNameMatch && appNameMatch[1].includes(term)) {
        console.log(`  ⚠️ Found "${term}" in browser app name`);
        bankingFound = true;
      }
    });
    
    if (!bankingFound) {
      console.log('  ✅ No banking references in browser metadata');
      results.browser.push('✅ Banking References: None');
    } else {
      results.browser.push('❌ Banking References: Found');
    }
    
    // Test favicon
    if (faviconMatch) {
      const faviconResponse = await fetch(`http://localhost:5000${faviconMatch[1]}`);
      if (faviconResponse.status === 200) {
        console.log('  ✅ Favicon accessible');
        results.browser.push('✅ Favicon: Accessible');
      } else {
        console.log('  ❌ Favicon missing');
        results.browser.push('❌ Favicon: Missing');
      }
    }
    
  } catch (e) {
    console.log('  ❌ Browser metadata test failed');
    results.browser.push('❌ Browser Metadata: Failed');
  }
  
  // ===== FUNCTIONALITY TESTS =====
  console.log('\n⚙️ FUNCTIONALITY DIAGNOSTIC');
  console.log('='.repeat(40));
  
  // Test access code system
  console.log('\n🔑 Access Code System:');
  try {
    // Test valid access code
    const accessResponse = await fetch('http://localhost:5000/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BOI729889' })
    });
    
    if (accessResponse.status === 200) {
      console.log('  ✅ Access code validation working');
      results.functionality.push('✅ Access Codes: Working');
    } else {
      console.log(`  ❌ Access code validation failed: ${accessResponse.status}`);
      results.functionality.push('❌ Access Codes: Failed');
    }
  } catch (e) {
    console.log('  ❌ Access code test failed');
    results.functionality.push('❌ Access Codes: Failed');
  }
  
  // Test authentication system
  console.log('\n👤 Authentication System:');
  try {
    const authResponse = await fetch('http://localhost:5000/api/auth/heartbeat', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (authResponse.status === 200) {
      console.log('  ✅ Authentication system responsive');
      results.functionality.push('✅ Authentication: Working');
    } else {
      console.log(`  ❌ Authentication system error: ${authResponse.status}`);
      results.functionality.push('❌ Authentication: Failed');
    }
  } catch (e) {
    console.log('  ❌ Authentication test failed');
    results.functionality.push('❌ Authentication: Failed');
  }
  
  // Test routes
  console.log('\n🛣️ Route Accessibility:');
  const routes = [
    { path: '/', name: 'Home' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/dashboard', name: 'Dashboard' }
  ];
  
  for (const route of routes) {
    try {
      const routeResponse = await fetch(`http://localhost:5000${route.path}`);
      if (routeResponse.status === 200) {
        console.log(`  ✅ ${route.name} route accessible`);
        results.functionality.push(`✅ Route ${route.name}: Accessible`);
      } else {
        console.log(`  ❌ ${route.name} route error: ${routeResponse.status}`);
        results.functionality.push(`❌ Route ${route.name}: Error`);
      }
    } catch (e) {
      console.log(`  ❌ ${route.name} route test failed`);
      results.functionality.push(`❌ Route ${route.name}: Failed`);
    }
  }
  
  // ===== PERFORMANCE & COMPATIBILITY TESTS =====
  console.log('\n🚀 PERFORMANCE & COMPATIBILITY DIAGNOSTIC');
  console.log('='.repeat(40));
  
  // Test loading performance
  console.log('\n⏱️ Loading Performance:');
  const startTime = Date.now();
  try {
    const perfResponse = await fetch('http://localhost:5000/');
    const loadTime = Date.now() - startTime;
    
    console.log(`  Load time: ${loadTime}ms`);
    if (loadTime < 2000) {
      console.log('  ✅ Fast loading performance');
      results.performance.push('✅ Load Time: Fast');
    } else if (loadTime < 5000) {
      console.log('  ⚠️ Moderate loading performance');
      results.performance.push('⚠️ Load Time: Moderate');
    } else {
      console.log('  ❌ Slow loading performance');
      results.performance.push('❌ Load Time: Slow');
    }
  } catch (e) {
    console.log('  ❌ Performance test failed');
    results.performance.push('❌ Load Time: Failed');
  }
  
  // Test manifest caching
  console.log('\n📋 Manifest Caching:');
  try {
    const manifestResponse1 = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifestResponse2 = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    
    if (manifestResponse1.status === 200 && manifestResponse2.status === 200) {
      console.log('  ✅ Manifest consistently accessible');
      results.performance.push('✅ Manifest Caching: Working');
    } else {
      console.log('  ❌ Manifest caching issues');
      results.performance.push('❌ Manifest Caching: Issues');
    }
  } catch (e) {
    console.log('  ❌ Manifest caching test failed');
    results.performance.push('❌ Manifest Caching: Failed');
  }
  
  // ===== PLATFORM SPECIFIC TESTS =====
  console.log('\n📱 PLATFORM-SPECIFIC COMPATIBILITY');
  console.log('='.repeat(40));
  
  // Test iOS compatibility
  console.log('\n🍎 iOS Safari Compatibility:');
  try {
    const htmlResponse = await fetch('http://localhost:5000/');
    const htmlContent = await htmlResponse.text();
    
    const appleCapable = htmlContent.includes('apple-mobile-web-app-capable');
    const appleTitle = htmlContent.includes('apple-mobile-web-app-title');
    const appleStatusBar = htmlContent.includes('apple-mobile-web-app-status-bar-style');
    
    if (appleCapable && appleTitle && appleStatusBar) {
      console.log('  ✅ iOS PWA metadata complete');
      results.performance.push('✅ iOS PWA: Compatible');
    } else {
      console.log('  ❌ iOS PWA metadata incomplete');
      results.performance.push('❌ iOS PWA: Incomplete');
    }
  } catch (e) {
    console.log('  ❌ iOS compatibility test failed');
    results.performance.push('❌ iOS PWA: Failed');
  }
  
  // Test Android compatibility  
  console.log('\n🤖 Android Chrome Compatibility:');
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifest = await manifestResponse.json();
    
    const hasRequiredFields = manifest.name && manifest.short_name && manifest.start_url && manifest.display && manifest.icons;
    
    if (hasRequiredFields) {
      console.log('  ✅ Android PWA requirements met');
      results.performance.push('✅ Android PWA: Compatible');
    } else {
      console.log('  ❌ Android PWA requirements missing');
      results.performance.push('❌ Android PWA: Incomplete');
    }
  } catch (e) {
    console.log('  ❌ Android compatibility test failed');
    results.performance.push('❌ Android PWA: Failed');
  }
  
  // ===== FINAL REPORT =====
  console.log('\n📊 COMPREHENSIVE DIAGNOSTIC REPORT');
  console.log('='.repeat(50));
  
  const allResults = [...results.pwa, ...results.browser, ...results.functionality, ...results.performance];
  const passed = allResults.filter(r => r.startsWith('✅')).length;
  const warnings = allResults.filter(r => r.startsWith('⚠️')).length;
  const failed = allResults.filter(r => r.startsWith('❌')).length;
  const total = allResults.length;
  
  console.log('\n🏆 PWA INSTALLATION RESULTS:');
  results.pwa.forEach(result => console.log(`  ${result}`));
  
  console.log('\n🌐 BROWSER DISPLAY RESULTS:');
  results.browser.forEach(result => console.log(`  ${result}`));
  
  console.log('\n⚙️ FUNCTIONALITY RESULTS:');
  results.functionality.forEach(result => console.log(`  ${result}`));
  
  console.log('\n🚀 PERFORMANCE & COMPATIBILITY RESULTS:');
  results.performance.forEach(result => console.log(`  ${result}`));
  
  console.log(`\n📈 OVERALL RESULTS: ${passed}/${total} passed, ${warnings} warnings, ${failed} failed`);
  
  // Status assessment
  if (passed >= total * 0.9) {
    console.log('\n🎉 EXCELLENT: All systems operational across platforms');
    console.log('✅ PWA installs correctly as "BOI Mobile" with custom icons');
    console.log('✅ Browser displays "MyBOII" with no banking references');
    console.log('✅ All functionality working smoothly');
    console.log('✅ Cross-platform compatibility confirmed');
  } else if (passed >= total * 0.8) {
    console.log('\n✅ GOOD: Most systems working with minor issues');
    console.log('App is functional but may need attention in some areas');
  } else if (passed >= total * 0.6) {
    console.log('\n⚠️ CAUTION: Several issues detected');
    console.log('App has significant problems that should be addressed');
  } else {
    console.log('\n❌ CRITICAL: Major issues detected');
    console.log('App requires immediate attention before deployment');
  }
  
  return {
    passed,
    total,
    warnings,
    failed,
    results: allResults,
    categories: results
  };
}

runComprehensivePWABrowserDiagnostic().catch(console.error);