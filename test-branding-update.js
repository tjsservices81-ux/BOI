async function testBrandingUpdate() {
  console.log('🏷️ TESTING MYBOI APP BRANDING UPDATE\n');
  
  const results = [];
  
  // Test dynamic manifest branding
  console.log('📋 Testing Dynamic Manifest Branding:');
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifest = await manifestResponse.json();
    
    console.log(`  App Name: ${manifest.name}`);
    console.log(`  Short Name: ${manifest.short_name}`);
    console.log(`  Description: ${manifest.description}`);
    
    if (manifest.name === 'MyBOI App') {
      console.log('  ✅ App name: Updated to MyBOI App');
      results.push('✅ Manifest name: MyBOI App');
    } else {
      console.log('  ❌ App name: Still shows old branding');
      results.push('❌ Manifest name: Not updated');
    }
    
    if (manifest.short_name === 'MyBOI') {
      console.log('  ✅ Short name: Updated to MyBOI');
      results.push('✅ Manifest short_name: MyBOI');
    } else {
      console.log('  ❌ Short name: Still shows old branding');
      results.push('❌ Manifest short_name: Not updated');
    }
    
    if (manifest.description.includes('MyBOI')) {
      console.log('  ✅ Description: Updated to MyBOI branding');
      results.push('✅ Manifest description: MyBOI branded');
    } else {
      console.log('  ❌ Description: Still shows old branding');
      results.push('❌ Manifest description: Not updated');
    }
    
  } catch (e) {
    console.log('  ❌ Manifest test: Failed to fetch');
    results.push('❌ Manifest fetch: Failed');
  }
  
  // Test HTML meta tags
  console.log('\n🏠 Testing HTML Meta Tags:');
  try {
    const htmlResponse = await fetch('http://localhost:5000/');
    const htmlContent = await htmlResponse.text();
    
    if (htmlContent.includes('<title>MyBOI App</title>')) {
      console.log('  ✅ HTML title: MyBOI App');
      results.push('✅ HTML title: MyBOI App');
    } else {
      console.log('  ❌ HTML title: Not updated');
      results.push('❌ HTML title: Not updated');
    }
    
    if (htmlContent.includes('apple-mobile-web-app-title" content="MyBOI App"')) {
      console.log('  ✅ Apple web app title: MyBOI App');
      results.push('✅ Apple web app title: MyBOI App');
    } else {
      console.log('  ❌ Apple web app title: Not updated');
      results.push('❌ Apple web app title: Not updated');
    }
    
    if (htmlContent.includes('application-name" content="MyBOI App"')) {
      console.log('  ✅ Application name: MyBOI App');
      results.push('✅ Application name: MyBOI App');
    } else {
      console.log('  ❌ Application name: Not updated');
      results.push('❌ Application name: Not updated');
    }
    
    if (htmlContent.includes('og:title" content="MyBOI App"')) {
      console.log('  ✅ Open Graph title: MyBOI App');
      results.push('✅ Open Graph title: MyBOI App');
    } else {
      console.log('  ❌ Open Graph title: Not updated');
      results.push('❌ Open Graph title: Not updated');
    }
    
  } catch (e) {
    console.log('  ❌ HTML test: Failed to fetch');
    results.push('❌ HTML fetch: Failed');
  }
  
  // Check for old branding remnants
  console.log('\n🔍 Checking for Old Branding:');
  const oldBrandingTerms = ['Bank of Ireland', 'BOI Mobile'];
  
  try {
    const manifestResponse = await fetch('http://localhost:5000/manifest.json?access=BOI729889');
    const manifest = await manifestResponse.json();
    const manifestString = JSON.stringify(manifest);
    
    let oldBrandingFound = false;
    oldBrandingTerms.forEach(term => {
      if (manifestString.includes(term)) {
        console.log(`  ⚠️ Found old branding: "${term}" in manifest`);
        oldBrandingFound = true;
      }
    });
    
    if (!oldBrandingFound) {
      console.log('  ✅ No old branding found in manifest');
      results.push('✅ Old branding removal: Complete');
    } else {
      results.push('⚠️ Old branding removal: Incomplete');
    }
    
  } catch (e) {
    console.log('  ❌ Old branding check: Failed');
    results.push('❌ Old branding check: Failed');
  }
  
  console.log('\n📊 Branding Update Summary:');
  console.log('='.repeat(40));
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\nResult: ${passed}/${total} tests passed, ${warnings} warnings`);
  
  if (passed >= total * 0.8) {
    console.log('🎉 MyBOI App branding successfully applied');
    console.log('App will display as "MyBOI App" on home screens');
    console.log('No "Bank of Ireland" references in user-facing content');
  } else {
    console.log('⚠️ Branding update needs attention');
  }
  
  return { passed, total, warnings, results };
}

testBrandingUpdate().catch(console.error);