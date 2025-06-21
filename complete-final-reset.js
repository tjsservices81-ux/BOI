import Database from '@replit/database';
import * as fs from 'fs';
import * as path from 'path';

const db = new Database();

async function completeFinalReset() {
  console.log('🔄 COMPLETE FINAL RESET\n');
  
  // Wipe entire database
  try {
    const allKeys = await db.list();
    const keyArray = Array.isArray(allKeys) ? allKeys : Object.keys(allKeys || {});
    
    for (const key of keyArray) {
      await db.delete(key);
    }
    console.log(`✅ Deleted ${keyArray.length} database keys`);
  } catch (e) {
    console.log('Database already empty');
  }
  
  // Clear storage file completely
  try {
    const dataPath = path.join(process.cwd(), 'data', 'storage.json');
    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
      console.log('✅ Deleted storage file');
    }
  } catch (e) {
    console.log('Storage already cleared');
  }
  
  // Clear data directory
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        fs.unlinkSync(path.join(dataDir, file));
      }
      console.log(`✅ Cleared ${files.length} data files`);
    }
  } catch (e) {
    console.log('Data directory already empty');
  }
  
  console.log('\n🎯 RESET COMPLETE');
  console.log('- All access codes deleted');
  console.log('- All user accounts removed');
  console.log('- All session data cleared');
  console.log('- Storage completely wiped');
  console.log('\nApp is now in fresh installation state');
}

completeFinalReset().catch(console.error);