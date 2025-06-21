import Database from '@replit/database';
const db = new Database();

async function createFreshCode() {
  try {
    // Create a completely fresh test code
    const testCode = 'FRESH2024';
    await db.set(`access_code_${testCode}`, {
      code: testCode,
      used: false,
      createdAt: new Date().toISOString(),
      description: `Fresh test access code: ${testCode}`
    });
    
    console.log(`Created fresh test code: ${testCode}`);
    console.log(`Test URL: /?access=${testCode}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFreshCode();