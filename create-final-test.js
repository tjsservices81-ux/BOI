import Database from '@replit/database';
const db = new Database();

async function createFinalTest() {
  try {
    // Create a completely fresh test code
    const testCode = 'FINAL2024';
    await db.set(`access_code_${testCode}`, JSON.stringify({
      code: testCode,
      used: false,
      createdAt: new Date().toISOString(),
      description: `Final test access code: ${testCode}`
    }));
    
    console.log(`Created fresh test code: ${testCode}`);
    console.log(`Test URL: https://myboi.link?access=${testCode}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFinalTest();