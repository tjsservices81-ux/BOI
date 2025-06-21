async function testFinalBranding() {
  console.log('🎯 TESTING FINAL BRANDING CONFIGURATION\n');
  
  const results = [];
  
  // Test dynamic manifest (PWA configuration)
  console.log('📱 Testing PWA Manifest (Apple/Android Web App):');
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifest = await manifestResponse.json();
    
    console.log(`  PWA Name: "${manifest.name}"`);
    console.log(`  PWA Short Name: "${manifest.short_name}"`);
    console.log(`  PWA Description: "${manifest.description}"`);
    console.log(`  Theme Color: ${manifest.theme_color}`);
    console.log(`  Background Color: ${manifest.background_color}`);
    
    if (manifest.name === 'BOI Mobile') {
      console.log('  ✅ PWA displays as "BOI Mobile"');
      results.push('✅ PWA name: BOI Mobile');
    } else {
      console.log('  ❌ PWA name incorrect');
      results.push('❌ PWA name: Incorrect');
    }
    
    if (manifest.short_name === 'BOI Mobile') {
      console.log('  ✅ PWA short name correct');
      results.push('✅ PWA short name: BOI Mobile');
    } else {
      console.log('  ❌ PWA short name incorrect');
      results.push('❌ PWA short name: Incorrect');
    }
    
    if (manifest.theme_color === '#0047ab') {
      console.log('  ✅ Theme color updated');
      results.push('✅ Theme color: #0047ab');
    } else {
      console.log('  ❌ Theme color not updated');
      results.push('❌ Theme color: Not updated');
    }
    
    if (manifest.background_color === '#ffffff') {
      console.log('  ✅ Background color updated');
      results.push('✅ Background color: #ffffff');
    } else {
      console.log('  ❌ Background color not updated');
      results.push('❌ Background color: Not updated');
    }
    
  } catch (e) {
    console.log('  ❌ PWA manifest test failed');
    results.push('❌ PWA manifest: Failed');
  }
  
  // Test browser HTML (browser display)
  console.log('\n🌐 Testing Browser Display:');
  try {
    const htmlResponse = await fetch('http://localhost:5000/');
    const htmlContent = await htmlResponse.text();
    
    if (htmlContent.includes('<title>MyBOII</title>')) {
      console.log('  ✅ Browser title: "MyBOII"');
      results.push('✅ Browser title: MyBOII');
    } else {
      console.log('  ❌ Browser title incorrect');
      results.push('❌ Browser title: Incorrect');
    }
    
    if (htmlContent.includes('apple-mobile-web-app-title" content="BOI Mobile"')) {
      console.log('  ✅ Apple web app title: "BOI Mobile"');
      results.push('✅ Apple web app title: BOI Mobile');
    } else {
      console.log('  ❌ Apple web app title incorrect');
      results.push('❌ Apple web app title: Incorrect');
    }
    
    if (htmlContent.includes('application-name" content="MyBOII"')) {
      console.log('  ✅ Application name: "MyBOII"');
      results.push('✅ Application name: MyBOII');
    } else {
      console.log('  ❌ Application name incorrect');
      results.push('❌ Application name: Incorrect');
    }
    
    if (htmlContent.includes('theme-color" content="#0047ab"')) {
      console.log('  ✅ HTML theme color: #0047ab');
      results.push('✅ HTML theme color: #0047ab');
    } else {
      console.log('  ❌ HTML theme color not updated');
      results.push('❌ HTML theme color: Not updated');
    }
    
  } catch (e) {
    console.log('  ❌ Browser HTML test failed');
    results.push('❌ Browser HTML: Failed');
  }
  
  // Test icon files
  console.log('\n🖼️ Testing Icon Files:');
  try {
    const icon192 = await fetch('http://localhost:5000/icons/boi-icon-192.png');
    const icon512 = await fetch('http://localhost:5000/icons/boi-icon-512.png');
    
    if (icon192.status === 200) {
      console.log('  ✅ 192px icon available');
      results.push('✅ Icon 192px: Available');
    } else {
      console.log('  ❌ 192px icon missing');
      results.push('❌ Icon 192px: Missing');
    }
    
    if (icon512.status === 200) {
      console.log('  ✅ 512px icon available');
      results.push('✅ Icon 512px: Available');
    } else {
      console.log('  ❌ 512px icon missing');
      results.push('❌ Icon 512px: Missing');
    }
    
  } catch (e) {
    console.log('  ❌ Icon test failed');
    results.push('❌ Icons: Failed');
  }
  
  // Check for banking references
  console.log('\n🔍 Checking for Banking References:');
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifest = await manifestResponse.json();
    const manifestString = JSON.stringify(manifest);
    
    if (manifestString.includes('Banking')) {
      console.log('  ⚠️ Found "Banking" reference in manifest');
      results.push('⚠️ Banking reference: Found in manifest');
    } else {
      console.log('  ✅ No banking references in manifest');
      results.push('✅ Banking references: Removed');
    }
    
  } catch (e) {
    console.log('  ❌ Banking reference check failed');
    results.push('❌ Banking check: Failed');
  }
  
  console.log('\n📊 Final Branding Test Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nResult: ${passed}/${total} tests passed, ${warnings} warnings`);
  
  console.log('\n🎯 BRANDING CONFIGURATION:');
  console.log('• PWA Install (iOS/Android): "BOI Mobile"');
  console.log('• Browser Tab Title: "MyBOII"');
  console.log('• Apple Web App Title: "BOI Mobile"');
  console.log('• Application Name: "MyBOII"');
  console.log('• Theme Color: #0047ab (blue)');
  console.log('• Background: #ffffff (white)');
  
  if (passed >= total * 0.8) {
    console.log('\n🎉 Branding configuration complete');
    console.log('Users will see correct names in both contexts');
  } else {
    console.log('\n⚠️ Branding needs attention');
  }
  
  return { passed, total, warnings, results };
}

testFinalBranding().catch(console.error);