import Database from '@replit/database';
const db = new Database();

async function createFinalAccessCode() {
  try {
    const testCode = 'ACCESS2024';
    await db.set(`access_code_${testCode}`, {
      code: testCode,
      used: false,
      createdAt: new Date().toISOString(),
      description: `Final test access code: ${testCode}`
    });
    
    console.log(`Created final test code: ${testCode}`);
    console.log(`URL: /?access=${testCode}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFinalAccessCode();