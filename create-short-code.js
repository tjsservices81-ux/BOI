import Database from '@replit/database';
const db = new Database();

async function createShortCode() {
  const shortCode = `BOI${Date.now().toString().slice(-6)}`;
  
  await db.set(`access_code_${shortCode}`, {
    code: shortCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Short code: ${shortCode}`
  });
  
  console.log(`Short code: ${shortCode}`);
  console.log(`URL: /?access=${shortCode}`);
  
  return shortCode;
}

createShortCode().catch(console.error);