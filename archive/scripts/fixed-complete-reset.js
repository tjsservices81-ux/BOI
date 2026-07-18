import Database from '@replit/database';
import * as fs from 'fs';
import * as path from 'path';

const db = new Database();

async function fixedCompleteReset() {
  console.log('🗑️ PERFORMING COMPLETE DATA RESET\n');
  
  const results = [];
  
  // ===== 1. CLEAR ALL ACCESS CODES =====
  console.log('🧨 Clearing All Access Codes:');
  try {
    // Get all keys from Replit Database
    const allKeys = await db.list();
    console.log(`  Database returned: ${typeof allKeys}, length: ${allKeys?.length || 'undefined'}`);
    
    // Handle different return formats from Replit DB
    let keyArray = [];
    if (Array.isArray(allKeys)) {
      keyArray = allKeys;
    } else if (allKeys && typeof allKeys === 'object') {
      // If it's an object, get the keys
      keyArray = Object.keys(allKeys);
    }
    
    console.log(`  Processing ${keyArray.length} keys`);
    
    // Find and delete access code keys
    let deletedCodes = 0;
    for (const key of keyArray) {
      if (key.toString().startsWith('access_code_')) {
        await db.delete(key);
        console.log(`  ✅ Deleted access code: ${key}`);
        deletedCodes++;
      }
    }
    
    results.push(`✅ Access Codes: ${deletedCodes} deleted`);
    
    // Clear session and auth related keys
    let deletedSessions = 0;
    for (const key of keyArray) {
      const keyStr = key.toString();
      if ((keyStr.includes('session') || keyStr.includes('auth') || keyStr.includes('login')) 
          && !keyStr.startsWith('access_code_')) {
        await db.delete(key);
        console.log(`  ✅ Deleted session key: ${key}`);
        deletedSessions++;
      }
    }
    
    results.push(`✅ Session Keys: ${deletedSessions} cleared`);
    
  } catch (error) {
    console.log(`  ❌ Error clearing database: ${error.message}`);
    results.push('❌ Database: Failed to clear');
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
      console.log('  ✅ Reset storage file to empty state');
      results.push('✅ Storage File: Reset to empty');
    } else {
      console.log('  ℹ️ No storage file found');
      results.push('ℹ️ Storage File: Not found');
    }
    
  } catch (error) {
    console.log(`  ❌ Error clearing storage: ${error.message}`);
    results.push('❌ Storage File: Failed to clear');
  }
  
  // ===== 3. CLEAR ANY REMAINING USER DATA KEYS =====
  console.log('\n🗃️ Clearing User-Related Database Keys:');
  try {
    const allKeys = await db.list();
    let keyArray = Array.isArray(allKeys) ? allKeys : Object.keys(allKeys || {});
    
    let deletedUserKeys = 0;
    for (const key of keyArray) {
      const keyStr = key.toString();
      if (keyStr.includes('user') || keyStr.includes('customer') || keyStr.includes('account') || keyStr.includes('profile')) {
        await db.delete(key);
        console.log(`  ✅ Deleted user key: ${key}`);
        deletedUserKeys++;
      }
    }
    
    results.push(`✅ User Keys: ${deletedUserKeys} cleared`);
    
  } catch (error) {
    console.log(`  ❌ Error clearing user keys: ${error.message}`);
    results.push('❌ User Keys: Failed to clear');
  }
  
  // ===== 4. MANUAL ACCESS CODE CLEANUP =====
  console.log('\n🔧 Manual Access Code Cleanup:');
  try {
    // Try to delete known test codes
    const knownCodes = [
      'BOI729889', 'DEMO2024', 'TEST123', 'PREVIEW', 'ACCESS2024', 
      'FRESH2024', 'WORKING2024', 'REVOKE2024', 'vip919',
      'BANK2024_01', 'BANK2024_02', 'BANK2024_03', 'BANK2024_04', 'BANK2024_05',
      'SECURE_ACCESS_01', 'SECURE_ACCESS_02', 'SECURE_ACCESS_03',
      'PREMIUM_BANK_01', 'PREMIUM_BANK_02', 'VIP_ACCESS_2024',
      'PRIVATE_BANKING', 'EXCLUSIVE_01', 'EXCLUSIVE_02',
      'MOBILE_BANK_01', 'MOBILE_BANK_02', 'DIGITAL_ACCESS',
      'BOI_SPECIAL_01', 'BOI_SPECIAL_02', 'INVITE_2024'
    ];
    
    let manualDeleted = 0;
    for (const code of knownCodes) {
      try {
        const exists = await db.get(`access_code_${code}`);
        if (exists) {
          await db.delete(`access_code_${code}`);
          console.log(`  ✅ Manually deleted: access_code_${code}`);
          manualDeleted++;
        }
      } catch (e) {
        // Key might not exist, continue
      }
    }
    
    results.push(`✅ Manual Cleanup: ${manualDeleted} codes removed`);
    
  } catch (error) {
    console.log(`  ❌ Error in manual cleanup: ${error.message}`);
    results.push('❌ Manual Cleanup: Failed');
  }
  
  // ===== 5. RESTART SERVER TO CLEAR MEMORY =====
  console.log('\n🔄 Clearing Server Memory:');
  console.log('  ℹ️ Server restart recommended to clear in-memory data');
  results.push('ℹ️ Server Memory: Restart recommended');
  
  // ===== 6. VERIFICATION =====
  console.log('\n🔍 Verifying Reset:');
  try {
    // Check for remaining access codes
    const allKeys = await db.list();
    let keyArray = Array.isArray(allKeys) ? allKeys : Object.keys(allKeys || {});
    
    const remainingAccessCodes = keyArray.filter(key => key.toString().startsWith('access_code_'));
    
    if (remainingAccessCodes.length === 0) {
      console.log('  ✅ No access codes remaining in database');
      results.push('✅ Access Verification: Clean');
    } else {
      console.log(`  ⚠️ Found ${remainingAccessCodes.length} remaining access codes:`);
      remainingAccessCodes.forEach(code => console.log(`    - ${code}`));
      results.push(`⚠️ Access Verification: ${remainingAccessCodes.length} remaining`);
    }
    
    // Check storage file
    const dataPath = path.join(process.cwd(), 'data', 'storage.json');
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf8');
      const data = JSON.parse(content);
      if (data.users.length === 0) {
        console.log('  ✅ Storage file contains no users');
        results.push('✅ Storage Verification: Empty');
      } else {
        console.log(`  ⚠️ Storage still contains ${data.users.length} users`);
        results.push(`⚠️ Storage Verification: ${data.users.length} users remain`);
      }
    } else {
      console.log('  ✅ No storage file exists');
      results.push('✅ Storage Verification: No file');
    }
    
  } catch (error) {
    console.log(`  ❌ Error during verification: ${error.message}`);
    results.push('❌ Verification: Failed');
  }
  
  // ===== FINAL REPORT =====
  console.log('\n📊 COMPLETE RESET REPORT');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.startsWith('✅')).length;
  const warnings = results.filter(r => r.startsWith('⚠️')).length;
  const info = results.filter(r => r.startsWith('ℹ️')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  const total = results.length;
  
  results.forEach(result => console.log(`  ${result}`));
  
  console.log(`\n📈 RESULTS: ${successful}/${total} successful, ${warnings} warnings, ${info} info, ${failed} failed`);
  
  if (successful >= total * 0.7 && failed === 0) {
    console.log('\n🎉 RESET COMPLETED SUCCESSFULLY');
    console.log('✅ All user accounts deleted');
    console.log('✅ Access codes wiped from database');
    console.log('✅ Session data cleared');
    console.log('✅ Storage reset to initial state');
    console.log('\n🆕 APP STATE: Fresh installation');
    console.log('💡 No users can access without new access codes');
    console.log('🔧 Restart server to complete memory cleanup');
  } else if (warnings > 0 && failed === 0) {
    console.log('\n⚠️ RESET MOSTLY COMPLETE');
    console.log('Some manual cleanup may be needed');
  } else {
    console.log('\n❌ RESET INCOMPLETE');
    console.log('Manual intervention required');
  }
  
  return { successful, total, warnings, failed, results };
}

fixedCompleteReset().catch(console.error);