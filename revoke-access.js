import Database from '@replit/database';
const db = new Database();

async function revokeAccess() {
  const code = process.argv[2] || 'DEMO_REVOKE_2024';
  
  console.log(`Revoking access for code: ${code}`);
  
  // Revoke the access
  await db.set(`access_code_${code}`, {
    code: code,
    used: true,
    valid: false,
    usedAt: new Date().toISOString(),
    revokedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: `Revoked access code: ${code}`
  });
  
  console.log(`✓ Access revoked for code: ${code}`);
  console.log('✓ Users will be blocked within 30 seconds');
  console.log('✓ They will see "Access denied or revoked" message');
}

revokeAccess().catch(console.error);