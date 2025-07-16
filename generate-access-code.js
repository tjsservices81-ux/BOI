/**
 * Generate a fresh access code for Bank of Ireland mobile banking app
 */

async function generateAccessCode() {
  try {
    const response = await fetch('http://localhost:5000/api/create-access-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceType: 'iOS',
        adminGenerated: true
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ NEW ACCESS CODE GENERATED:');
      console.log('============================');
      console.log('');
      console.log(`🎫 Code: ${result.accessCode}`);
      console.log(`📱 Device: ${result.deviceType}`);
      console.log(`🔢 Uses: ${result.uses} remaining`);
      console.log('');
      console.log('🔗 Access URL:');
      console.log(`   http://localhost:5000/?access=${result.accessCode}`);
      console.log('');
      console.log('📋 Instructions:');
      console.log('1. Click the URL above or enter the code manually');
      console.log('2. Complete the splash screen sequence');
      console.log('3. Register or log in with your banking credentials');
      console.log('');
      return result.accessCode;
    } else {
      console.error('❌ Failed to generate access code');
      const error = await response.json();
      console.error('Error:', error.message);
    }
  } catch (error) {
    console.error('❌ Error generating access code:', error.message);
  }
}

generateAccessCode();