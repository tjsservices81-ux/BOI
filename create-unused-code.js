import Database from '@replit/database';
const db = new Database();

async function createUnusedCode() {
  const timestamp = Date.now();
  const freshCode = `FRESH_${timestamp}`;
  
  await db.set(`access_code_${freshCode}`, {
    code: freshCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Fresh unused code: ${freshCode}`
  });
  
  // Verify it works
  const verifyResponse = await fetch('http://localhost:5000/api/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: freshCode })
  });
  
  const result = await verifyResponse.json();
  
  console.log(`Fresh unused code: ${freshCode}`);
  console.log(`Status: ${result.success ? 'Ready to use' : 'Error'}`);
  console.log(`URL: /?access=${freshCode}`);
  
  return freshCode;
}

createUnusedCode().catch(console.error);