import Database from '@replit/database';
import * as fs from 'fs';
import * as path from 'path';

const db = new Database();

async function completeDataReset() {
  console.log('🗑️ PERFORMING COMPLETE DATA RESET\n');
  console.log('This will delete all users, access codes, and session data...\n');
  
  const results = [];
  
  // ===== 1. CLEAR ALL ACCESS CODES =====
  console.log('🧨 Clearing All Access Codes:');
  try {
    // Get all keys from Replit Database
    const allKeys = await db.list();
    const accessCodeKeys = allKeys.filter(key => key.startsWith('access_code_'));
    
    console.log(`  Found ${accessCodeKeys.length} access codes to delete`);
    
    for (const key of accessCodeKeys) {
      await db.delete(key);
      console.log(`  ✅ Deleted: ${key}`);
    }
    
    results.push(`✅ Access Codes: ${accessCodeKeys.length} deleted`);
    
    // Clear any remaining access-related keys
    const sessionKeys = allKeys.filter(key => 
      key.includes('session') || 
      key.includes('auth') || 
      key.includes('login') ||
      key.includes('access')
    );
    
    for (const key of sessionKeys) {
      if (!key.startsWith('access_code_')) { // Already handled above
        await db.delete(key);
        console.log(`  ✅ Cleared session key: ${key}`);
      }
    }
    
    results.push(`✅ Session Keys: ${sessionKeys.length} cleared`);
    
  } catch (error) {
    console.log('  ❌ Error clearing access codes:', error.message);
    results.push('❌ Access Codes: Failed to clear');
  }
  
  // ===== 2. CLEAR USER DATA STORAGE =====
  console.log('\n🗑️ Clearing User Data Storage:');
  try {
    const dataPath = path.join(process.cwd(), 'data', 'storage.json');
    
    if (fs.existsSync(dataPath)) {
      // Create empty storage structure
      const emptyData = {
        users: [],
        accounts: [],
        transactions: [],
        payees: [],
        scheduledPayments: [],
        statements: [],
        chatMessages: [],
        chatResponses: [],
        chatSessions: [],
        counters: {
          currentUserId: 1,
          currentAccountId: 1,
          currentTransactionId: 1,
          currentPayeeId: 1,
          currentScheduledPaymentId: 1,
          currentStatementId: 1,
          currentChatMessageId: 1,
          currentChatResponseId: 1
        }
      };
      
      fs.writeFileSync(dataPath, JSON.stringify(emptyData, null, 2));
      console.log('  ✅ Cleared persistent storage file');
      results.push('✅ Storage File: Cleared');
    } else {
      console.log('  ℹ️ No storage file found');
      results.push('ℹ️ Storage File: Not found');
    }
    
  } catch (error) {
    console.log('  ❌ Error clearing storage:', error.message);
    results.push('❌ Storage File: Failed to clear');
  }
  
  // ===== 3. CLEAR ENTIRE DATA DIRECTORY =====
  console.log('\n🧹 Clearing Data Directory:');
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    if (fs.existsSync(dataDir)) {
      // Remove all files in data directory
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        const filePath = path.join(dataDir, file);
        fs.unlinkSync(filePath);
        console.log(`  ✅ Deleted: ${file}`);
      }
      results.push(`✅ Data Files: ${files.length} deleted`);
    } else {
      console.log('  ℹ️ No data directory found');
      results.push('ℹ️ Data Directory: Not found');
    }
    
  } catch (error) {
    console.log('  ❌ Error clearing data directory:', error.message);
    results.push('❌ Data Directory: Failed to clear');
  }
  
  // ===== 4. CLEAR ANY REMAINING DATABASE ENTRIES =====
  console.log('\n🗃️ Clearing Remaining Database Entries:');
  try {
    const allKeys = await db.list();
    const remainingKeys = allKeys.filter(key => 
      key.includes('user') || 
      key.includes('account') || 
      key.includes('transaction') ||
      key.includes('customer') ||
      key.includes('profile')
    );
    
    console.log(`  Found ${remainingKeys.length} additional keys to clear`);
    
    for (const key of remainingKeys) {
      await db.delete(key);
      console.log(`  ✅ Deleted: ${key}`);
    }
    
    results.push(`✅ Database Keys: ${remainingKeys.length} cleared`);
    
  } catch (error) {
    console.log('  ❌ Error clearing database:', error.message);
    results.push('❌ Database: Failed to clear');
  }
  
  // ===== 5. VERIFY COMPLETE RESET =====
  console.log('\n🔍 Verifying Complete Reset:');
  try {
    // Check for any remaining access codes
    const allKeys = await db.list();
    const remainingAccessCodes = allKeys.filter(key => key.startsWith('access_code_'));
    
    if (remainingAccessCodes.length === 0) {
      console.log('  ✅ No access codes remaining');
      results.push('✅ Access Code Verification: Clean');
    } else {
      console.log(`  ⚠️ Found ${remainingAccessCodes.length} remaining access codes`);
      results.push('⚠️ Access Code Verification: Incomplete');
    }
    
    // Check storage file
    const dataPath = path.join(process.cwd(), 'data', 'storage.json');
    if (!fs.existsSync(dataPath)) {
      console.log('  ✅ Storage file completely removed');
      results.push('✅ Storage Verification: Clean');
    } else {
      const content = fs.readFileSync(dataPath, 'utf8');
      const data = JSON.parse(content);
      if (data.users.length === 0) {
        console.log('  ✅ Storage file empty');
        results.push('✅ Storage Verification: Empty');
      } else {
        console.log(`  ⚠️ Storage still contains ${data.users.length} users`);
        results.push('⚠️ Storage Verification: Not empty');
      }
    }
    
  } catch (error) {
    console.log('  ❌ Error during verification:', error.message);
    results.push('❌ Verification: Failed');
  }
  
  // ===== FINAL REPORT =====
  console.log('\n📊 RESET COMPLETION REPORT');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.startsWith('✅')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\n📈 RESULTS: ${successful}/${total} successful, ${warnings} warnings, ${failed} failed`);
  
  if (successful >= total * 0.9) {
    console.log('\n🎉 COMPLETE RESET SUCCESSFUL');
    console.log('✅ All user accounts deleted');
    console.log('✅ All access codes wiped');
    console.log('✅ All session data cleared');
    console.log('✅ App ready for fresh start');
    console.log('\n🆕 The app now acts like it has never been accessed before');
    console.log('💡 Create new access codes to allow entry');
  } else if (warnings > 0 && failed === 0) {
    console.log('\n⚠️ RESET MOSTLY SUCCESSFUL');
    console.log('Some components may need manual verification');
  } else {
    console.log('\n❌ RESET INCOMPLETE');
    console.log('Manual intervention may be required');
  }
  
  return {
    successful,
    total,
    warnings,
    failed,
    results
  };
}

completeDataReset().catch(console.error);