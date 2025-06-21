import Database from '@replit/database';
const db = new Database();

async function createFreshCode() {
  const freshCode = 'vip' + Math.floor(Math.random() * 1000);
  
  await db.set(`access_code_${freshCode}`, {
    code: freshCode,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Fresh access code: ${freshCode}`,
    usage: {
      ios: 0,
      nonIos: 0,
      totalUses: 0,
      devices: []
    }
  });
  
  console.log(`✓ Created fresh code: ${freshCode}`);
  console.log(`URL: /?access=${freshCode}`);
}

createFreshCode().catch(console.error);