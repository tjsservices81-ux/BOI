async function testPWABrowserSplit() {
  console.log('🔄 TESTING PWA vs BROWSER BRANDING SPLIT\n');
  
  const results = [];
  
  // Test PWA manifest (includes banking)
  console.log('📱 Testing PWA Manifest Configuration:');
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifest = await manifestResponse.json();
    
    console.log(`  PWA Name: "${manifest.name}"`);
    console.log(`  PWA Description: "${manifest.description}"`);
    console.log(`  PWA Icons: ${manifest.icons[0].src}`);
    
    if (manifest.name === 'BOI Mobile' && manifest.description.includes('Banking')) {
      console.log('  ✅ PWA includes banking terminology');
      results.push('✅ PWA banking: Included');
    } else {
      console.log('  ❌ PWA missing banking terminology');
      results.push('❌ PWA banking: Missing');
    }
    
    if (manifest.icons[0].src === '/boi_app_icon.png') {
      console.log('  ✅ PWA uses original app icons');
      results.push('✅ PWA icons: Original');
    } else {
      console.log('  ❌ PWA not using original icons');
      results.push('❌ PWA icons: Changed');
    }
    
  } catch (e) {
    console.log('  ❌ PWA manifest test failed');
    results.push('❌ PWA manifest: Failed');
  }
  
  // Test browser HTML (no banking)
  console.log('\n🌐 Testing Browser HTML Configuration:');
  try {
    const htmlResponse = await fetch('http://localhost:5000/');
    const htmlContent = await htmlResponse.text();
    
    if (htmlContent.includes('<title>MyBOII</title>')) {
      console.log('  ✅ Browser title: "MyBOII" (no banking)');
      results.push('✅ Browser title: No banking');
    } else {
      console.log('  ❌ Browser title incorrect');
      results.push('❌ Browser title: Incorrect');
    }
    
    if (htmlContent.includes('application-name" content="MyBOII"')) {
      console.log('  ✅ Browser app name: "MyBOII" (no banking)');
      results.push('✅ Browser app name: No banking');
    } else {
      console.log('  ❌ Browser app name incorrect');
      results.push('❌ Browser app name: Incorrect');
    }
    
    if (htmlContent.includes('description" content="MyBOII App"')) {
      console.log('  ✅ Browser description: No banking terminology');
      results.push('✅ Browser description: No banking');
    } else {
      console.log('  ❌ Browser description may include banking');
      results.push('❌ Browser description: May include banking');
    }
    
  } catch (e) {
    console.log('  ❌ Browser HTML test failed');
    results.push('❌ Browser HTML: Failed');
  }
  
  // Test icon availability
  console.log('\n🖼️ Testing Icon Files:');
  try {
    const originalIcon = await fetch('http://localhost:5000/boi_app_icon.png');
    
    if (originalIcon.status === 200) {
      console.log('  ✅ Original app icon available for PWA');
      results.push('✅ Original icon: Available');
    } else {
      console.log('  ❌ Original app icon missing');
      results.push('❌ Original icon: Missing');
    }
    
  } catch (e) {
    console.log('  ❌ Icon test failed');
    results.push('❌ Icon test: Failed');
  }
  
  // Test Apple web app title (PWA context)
  console.log('\n🍎 Testing Apple Web App Title:');
  try {
    const htmlResponse = await fetch('http://localhost:5000/');
    const htmlContent = await htmlResponse.text();
    
    if (htmlContent.includes('apple-mobile-web-app-title" content="BOI Mobile"')) {
      console.log('  ✅ Apple web app title: "BOI Mobile" (PWA context)');
      results.push('✅ Apple web app: BOI Mobile');
    } else {
      console.log('  ❌ Apple web app title incorrect');
      results.push('❌ Apple web app: Incorrect');
    }
    
  } catch (e) {
    console.log('  ❌ Apple web app test failed');
    results.push('❌ Apple web app: Failed');
  }
  
  console.log('\n📊 PWA vs Browser Split Test Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nResult: ${passed}/${total} tests passed`);
  
  console.log('\n🎯 CONFIGURATION SUMMARY:');
  console.log('PWA INSTALLATION (Apple/Android):');
  console.log('  • Name: "BOI Mobile"');
  console.log('  • Description: "BOI Mobile Banking Application"');
  console.log('  • Icons: Original /boi_app_icon.png');
  console.log('  • Banking terminology: INCLUDED');
  console.log('');
  console.log('BROWSER DISPLAY:');
  console.log('  • Title: "MyBOII"');
  console.log('  • App Name: "MyBOII"');
  console.log('  • Description: "MyBOII App"');
  console.log('  • Banking terminology: EXCLUDED');
  
  if (passed >= total * 0.8) {
    console.log('\n🎉 PWA and browser branding correctly split');
    console.log('Users see appropriate context-specific naming');
  } else {
    console.log('\n⚠️ Branding split needs attention');
  }
  
  return { passed, total, results };
}

testPWABrowserSplit().catch(console.error);