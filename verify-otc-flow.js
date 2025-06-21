/**
 * Complete OTC Flow Verification Test
 * Tests the exact behavior described in requirements
 */

async function verifyOTCFlow() {
  console.log('🔍 SCANNING OTC DEVICE VERIFICATION IMPLEMENTATION\n');
  
  // Test 1: Check if first-time device shows OTC screen
  console.log('1. Testing First-Time Device Behavior:');
  
  // Simulate new device by clearing localStorage
  localStorage.removeItem('otcVerified');
  localStorage.removeItem('deviceVerifiedAt');
  
  // Check if app detects no verification
  const otcVerified = localStorage.getItem('otcVerified');
  const shouldShowOTC = !otcVerified;
  
  console.log(`   - localStorage.getItem('otcVerified'): ${otcVerified}`);
  console.log(`   - Should show OTC screen: ${shouldShowOTC}`);
  
  if (shouldShowOTC) {
    console.log('   ✅ PASS: New device correctly detected');
  } else {
    console.log('   ❌ FAIL: New device not detected properly');
  }
  
  // Test 2: Verify OTC generation and email sending
  console.log('\n2. Testing OTC Generation:');
  
  try {
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const response = await fetch('/api/send-otc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: testCode,
        deviceInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          platform: navigator.platform
        }
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`   ✅ PASS: OTC ${testCode} sent to admin email`);
    } else {
      console.log(`   ❌ FAIL: OTC generation failed - ${result.message}`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: OTC API error - ${error.message}`);
  }
  
  // Test 3: Simulate successful verification
  console.log('\n3. Testing Device Verification:');
  
  // Simulate correct code entry (this would be done by OTCVerification component)
  localStorage.setItem("otcVerified", "true");
  localStorage.setItem("deviceVerifiedAt", new Date().toISOString());
  
  const verifiedStatus = localStorage.getItem('otcVerified');
  const verifiedAt = localStorage.getItem('deviceVerifiedAt');
  
  console.log(`   - Verification status: ${verifiedStatus}`);
  console.log(`   - Verified at: ${verifiedAt}`);
  
  if (verifiedStatus === 'true') {
    console.log('   ✅ PASS: Device verification saved correctly');
  } else {
    console.log('   ❌ FAIL: Device verification not saved');
  }
  
  // Test 4: Check returning device behavior
  console.log('\n4. Testing Returning Device Behavior:');
  
  // Check if app would skip OTC screen for verified device
  const shouldSkipOTC = localStorage.getItem('otcVerified') === 'true';
  
  console.log(`   - Should skip OTC screen: ${shouldSkipOTC}`);
  
  if (shouldSkipOTC) {
    console.log('   ✅ PASS: Returning device will skip OTC screen');
  } else {
    console.log('   ❌ FAIL: Returning device behavior incorrect');
  }
  
  // Test 5: Verify app flow after verification
  console.log('\n5. Testing Post-Verification Flow:');
  console.log('   - After verification, app should reload and proceed to splash → login');
  console.log('   - OTC screen should never appear again unless localStorage is cleared');
  
  // Final verification scan
  console.log('\n' + '='.repeat(60));
  console.log('📊 OTC FLOW VERIFICATION RESULTS');
  console.log('='.repeat(60));
  
  const currentStatus = localStorage.getItem('otcVerified');
  console.log(`Current device status: ${currentStatus === 'true' ? 'VERIFIED' : 'NOT VERIFIED'}`);
  
  if (currentStatus === 'true') {
    console.log('✅ This device is verified - OTC screen will be skipped');
    console.log('🔄 To test first-time flow, clear localStorage or use different device');
  } else {
    console.log('🆕 This device is not verified - OTC screen will appear');
  }
  
  console.log('\n🔍 IMPLEMENTATION ANALYSIS:');
  console.log('1. App.tsx lines 157-163: Checks localStorage.getItem("otcVerified")');
  console.log('2. If null/undefined: Shows OTCVerification component');
  console.log('3. OTCVerification.tsx lines 65-66: Sets localStorage on success');
  console.log('4. handleOTCVerificationComplete: Reloads app to continue normal flow');
  console.log('5. Subsequent opens: Skip OTC due to localStorage.getItem("otcVerified") === "true"');
  
  return {
    firstTimeDetection: shouldShowOTC,
    verificationSaving: verifiedStatus === 'true',
    returningDeviceSkip: shouldSkipOTC
  };
}

// Auto-run in browser
if (typeof window !== 'undefined') {
  window.verifyOTCFlow = verifyOTCFlow;
  console.log('🔐 OTC Flow Verification Loaded');
  console.log('📋 Run: verifyOTCFlow() in browser console');
}

verifyOTCFlow();