import Database from '@replit/database';
const db = new Database();

async function createTrulyFreshCode() {
  const timestamp = Date.now();
  const uniqueCode = `UNTOUCHED_${timestamp}`;
  
  // Create the code but DON'T verify it - that marks it as used
  await db.set(`access_code_${uniqueCode}`, {
    code: uniqueCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Truly fresh code - never verified: ${uniqueCode}`
  });
  
  console.log(`✅ Created fresh code: ${uniqueCode}`);
  console.log(`🚀 URL: /?access=${uniqueCode}`);
  console.log(`📱 This code has never been used or verified`);
  console.log(`💡 It will work on first access attempt`);
  
  // Check database state without verifying
  const dbState = await db.get(`access_code_${uniqueCode}`);
  console.log(`📊 Database state: used=${dbState.value.used}, valid=${dbState.value.valid}`);
  
  return uniqueCode;
}

createTrulyFreshCode().catch(console.error);