import Database from '@replit/database';
const db = new Database();

async function resetTestCode() {
  try {
    // Create a fresh test code
    await db.set('access_code_NEWTEST', JSON.stringify({
      code: 'NEWTEST',
      used: false,
      createdAt: new Date().toISOString(),
      description: 'Fresh test code for verification'
    }));
    
    console.log('Created fresh test code: NEWTEST');
    console.log('Test URL: https://myboi.link?access=NEWTEST');
    
    // Check current status of TEST123
    const oldCode = await db.get('access_code_TEST123');
    console.log('TEST123 status:', oldCode);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetTestCode();