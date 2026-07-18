import Database from '@replit/database';
const db = new Database();

async function demoRevocation() {
  console.log('=== Creating Fresh Access Code for Demo ===\n');
  
  const demoCode = 'DEMO_REVOKE_2024';
  
  // Create fresh code
  await db.set(`access_code_${demoCode}`, {
    code: demoCode,
    used: false,
    valid: true,
    createdAt: new Date().toISOString(),
    description: `Demo revocation code: ${demoCode}`
  });
  
  console.log(`✓ Created fresh demo code: ${demoCode}`);
  console.log(`✓ Access URL: /?access=${demoCode}`);
  console.log(`✓ Code status: unused and valid`);
  
  console.log('\n=== How to Test Revocation ===');
  console.log('1. Visit the URL above to access the app');
  console.log('2. Once inside, run this command to revoke access:');
  console.log(`   node revoke-access.js ${demoCode}`);
  console.log('3. Within 30 seconds, the user will be kicked out');
  console.log('4. They will see "Access denied or revoked" message');
  
  // Create revocation script
  const revokeScript = `import Database from '@replit/database';
const db = new Database();

async function revokeAccess() {
  const code = '${demoCode}';
  
  // Revoke the access
  await db.set(\`access_code_\${code}\`, {
    code: code,
    used: true,
    valid: false,
    usedAt: new Date().toISOString(),
    revokedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: \`Revoked access code: \${code}\`
  });
  
  console.log(\`✓ Access revoked for code: \${code}\`);
  console.log('✓ Users will be blocked within 30 seconds');
}

revokeAccess().catch(console.error);`;

  await require('fs').promises.writeFile('revoke-access.js', revokeScript);
  console.log('\n✓ Created revoke-access.js script');
}

demoRevocation().catch(console.error);