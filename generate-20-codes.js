import Database from '@replit/database';
const db = new Database();

async function generate20Codes() {
  console.log('Creating 20 fresh access codes...\n');
  
  const codes = [
    'BANK2024_01',
    'BANK2024_02', 
    'BANK2024_03',
    'BANK2024_04',
    'BANK2024_05',
    'SECURE_ACCESS_01',
    'SECURE_ACCESS_02',
    'SECURE_ACCESS_03',
    'PREMIUM_BANK_01',
    'PREMIUM_BANK_02',
    'VIP_ACCESS_2024',
    'PRIVATE_BANKING',
    'EXCLUSIVE_01',
    'EXCLUSIVE_02',
    'MOBILE_BANK_01',
    'MOBILE_BANK_02',
    'DIGITAL_ACCESS',
    'BOI_SPECIAL_01',
    'BOI_SPECIAL_02',
    'INVITE_2024'
  ];
  
  for (const code of codes) {
    await db.set(`access_code_${code}`, {
      code: code,
      used: false,
      valid: true,
      createdAt: new Date().toISOString(),
      description: `Access code: ${code}`
    });
    
    console.log(`✓ Created: ${code}`);
    console.log(`  URL: /?access=${code}`);
  }
  
  console.log(`\n🎉 Successfully created ${codes.length} access codes!`);
  console.log('\nAll codes are ready to use and can be revoked anytime by setting:');
  console.log('{ "used": true, "valid": false }');
}

generate20Codes().catch(console.error);