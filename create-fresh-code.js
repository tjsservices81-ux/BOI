import Database from '@replit/database';
const db = new Database();

async function createFreshCode() {
  const freshCode = 'fresh2024';
  
  await db.set(`access_code_${freshCode}`, {
    code: freshCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Fresh access code: ${freshCode}`
  });
  
  console.log(`✓ Created fresh code: ${freshCode}`);
  console.log(`URL: /?access=${freshCode}`);
}

createFreshCode().catch(console.error);