import Database from '@replit/database';
const db = new Database();

async function createWorkingTest() {
  try {
    // Create a fresh working test code
    const testCode = 'WORKING2024';
    await db.set(`access_code_${testCode}`, {
      code: testCode,
      used: false,
      createdAt: new Date().toISOString(),
      description: `Working test access code: ${testCode}`
    });
    
    console.log(`Created working test code: ${testCode}`);
    console.log(`Test this URL: /?access=${testCode}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createWorkingTest();