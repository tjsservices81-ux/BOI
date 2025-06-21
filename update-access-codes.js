import Database from '@replit/database';
const db = new Database();

async function updateAccessCodes() {
  try {
    // Create a new test code with the updated format
    const newTestCode = 'REVOKE2024';
    await db.set(`access_code_${newTestCode}`, {
      code: newTestCode,
      used: false,
      valid: true,
      createdAt: new Date().toISOString(),
      description: `Test code with revocation support: ${newTestCode}`
    });
    
    console.log(`Created new test code: ${newTestCode}`);
    console.log(`URL: /?access=${newTestCode}`);
    
    // Update existing codes to include valid field
    const existingCodes = ['DEMO2024', 'TEST123', 'PREVIEW', 'ACCESS2024', 'FRESH2024', 'WORKING2024'];
    
    for (const code of existingCodes) {
      try {
        const existingData = await db.get(`access_code_${code}`);
        if (existingData) {
          let codeInfo;
          if (typeof existingData === 'string') {
            codeInfo = JSON.parse(existingData);
          } else if (existingData && typeof existingData === 'object' && existingData.value) {
            codeInfo = typeof existingData.value === 'string' ? JSON.parse(existingData.value) : existingData.value;
          } else {
            codeInfo = existingData;
          }
          
          // Update with valid field if missing
          if (codeInfo.valid === undefined) {
            const updatedCodeInfo = {
              ...codeInfo,
              valid: true
            };
            
            await db.set(`access_code_${code}`, updatedCodeInfo);
            console.log(`Updated ${code} with valid field`);
          }
        }
      } catch (error) {
        console.log(`Could not update ${code}: ${error.message}`);
      }
    }
    
    console.log('\nAccess code format updated successfully!');
    console.log('\nTo revoke access for any code, update it in the database to:');
    console.log('{ "used": true, "valid": false }');
    
  } catch (error) {
    console.error('Error updating access codes:', error);
  }
}

updateAccessCodes();