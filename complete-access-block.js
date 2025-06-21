import Database from '@replit/database';
import * as fs from 'fs';
import * as path from 'path';

const db = new Database();

async function completeAccessBlock() {
  console.log('🚫 IMPLEMENTING COMPLETE ACCESS BLOCK\n');
  
  // 1. Clear all existing access codes
  try {
    const allKeys = await db.list();
    const keyArray = Array.isArray(allKeys) ? allKeys : Object.keys(allKeys || {});
    
    for (const key of keyArray) {
      await db.delete(key);
    }
    console.log(`✅ Cleared ${keyArray.length} database entries`);
  } catch (e) {
    console.log('Database already empty');
  }
  
  // 2. Set a global access block flag
  await db.set('SYSTEM_ACCESS_BLOCKED', {
    blocked: true,
    timestamp: new Date().toISOString(),
    reason: 'Complete system reset - all access codes disabled'
  });
  console.log('✅ Set global access block flag');
  
  // 3. Clear all storage
  try {
    const dataPath = path.join(process.cwd(), 'data', 'storage.json');
    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
    }
    
    const dataDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        fs.unlinkSync(path.join(dataDir, file));
      }
    }
    console.log('✅ Cleared all storage files');
  } catch (e) {
    console.log('Storage already cleared');
  }
  
  console.log('\n🎯 COMPLETE ACCESS BLOCK ACTIVE');
  console.log('- All database entries cleared');
  console.log('- Global access block flag set'); 
  console.log('- All storage wiped');
  console.log('- No access codes will work until block is removed');
}

completeAccessBlock().catch(console.error);