import Database from '@replit/database';
const db = new Database();

async function createPWATestCode() {
  const testCode = 'PWA_TEST_2024';
  
  await db.set(`access_code_${testCode}`, {
    code: testCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `PWA test code: ${testCode}`
  });
  
  console.log(`Created fresh PWA test code: ${testCode}`);
  console.log(`Test URL: /?access=${testCode}`);
}

createPWATestCode().catch(console.error);