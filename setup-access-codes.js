// Script to set up test access codes in Replit Database
const Database = require('@replit/database');
const db = new Database();

async function setupAccessCodes() {
  try {
    // Create some test access codes
    const testCodes = [
      'DEMO2024',
      'TEST123',
      'PREVIEW',
      'ADMIN001'
    ];

    for (const code of testCodes) {
      await db.set(`access_code_${code}`, JSON.stringify({
        code: code,
        used: false,
        createdAt: new Date().toISOString(),
        description: `Test access code: ${code}`
      }));
      console.log(`Created access code: ${code}`);
    }

    console.log('All test access codes created successfully!');
    console.log('Test URLs:');
    testCodes.forEach(code => {
      console.log(`https://myboi.link?access=${code}`);
    });

  } catch (error) {
    console.error('Error setting up access codes:', error);
  }
}

setupAccessCodes();