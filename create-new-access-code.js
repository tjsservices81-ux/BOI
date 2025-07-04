async function createNewAccessCode() {
  try {
    const response = await fetch('http://localhost:5000/api/admin/generate-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        count: 1,
        issuedBy: 'System Admin'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.codes && result.codes.length > 0) {
      const newCode = result.codes[0];
      console.log('\n✅ NEW ACCESS CODE CREATED:');
      console.log(`Code: ${newCode.code}`);
      console.log(`Uses Remaining: ${newCode.usesRemaining}`);
      console.log(`Device Limits: iOS/Android: 2 uses, Other: 1 use`);
      console.log(`Created: ${new Date().toLocaleString()}`);
      console.log(`Status: Active\n`);
      
      return newCode;
    } else {
      console.error('❌ Failed to create access code:', result.message || 'Unknown error');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error creating access code:', error.message);
    return null;
  }
}

// Run the function
createNewAccessCode();