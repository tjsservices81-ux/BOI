import Database from '@replit/database';
const db = new Database();

async function createFreshPWACode() {
  const timestamp = Date.now();
  const testCode = `PWA_FRESH_${timestamp}`;
  
  await db.set(`access_code_${testCode}`, {
    code: testCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Fresh PWA test code: ${testCode}`
  });
  
  console.log(`Created completely fresh code: ${testCode}`);
  console.log(`Test URL: /?access=${testCode}`);
  
  // Verify it was created
  const verification = await db.get(`access_code_${testCode}`);
  console.log('Verification:', verification);
}

createFreshPWACode().catch(console.error);