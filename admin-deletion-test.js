// Test admin deletion completeness with new localStorage keys
console.log('🔍 Testing admin deletion completeness...');

async function testAdminDeletion() {
  const baseUrl = 'http://localhost:5000';
  
  // Set up test scenario with all session keys present
  localStorage.setItem('bankingUser', JSON.stringify({id: 999, name: 'Test User'}));
  localStorage.setItem('currentUser', '999');
  localStorage.setItem('app_session_active', 'true');
  localStorage.setItem('splash_completed', 'true');
  localStorage.setItem('app_background_time', Date.now().toString());
  
  console.log('📝 Before deletion - localStorage keys present:');
  const beforeKeys = Object.keys(localStorage);
  console.log('Keys:', beforeKeys.filter(k => k.includes('user') || k.includes('app') || k.includes('splash')));
  
  try {
    // Test admin deletion API
    const response = await fetch(`${baseUrl}/admin/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerNumber: '999'
      }),
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Admin deletion response:', result);
      
      // Check if response includes clearStorageKeys instruction
      if (result.clearStorageKeys) {
        console.log('🧹 Clearing frontend storage keys:', result.clearStorageKeys);
        
        // Simulate frontend cleanup based on server response
        result.clearStorageKeys.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log('📝 After deletion - remaining localStorage keys:');
        const afterKeys = Object.keys(localStorage);
        const remainingUserKeys = afterKeys.filter(k => k.includes('user') || k.includes('app') || k.includes('splash'));
        
        if (remainingUserKeys.length === 0) {
          console.log('✅ SUCCESS: All session keys properly cleared');
        } else {
          console.log('❌ INCOMPLETE: Remaining keys:', remainingUserKeys);
        }
        
      } else {
        console.log('⚠️ WARNING: Server response missing clearStorageKeys instruction');
        console.log('🔍 Checking remaining keys manually...');
        
        const afterKeys = Object.keys(localStorage);
        const remainingUserKeys = afterKeys.filter(k => k.includes('user') || k.includes('app') || k.includes('splash'));
        
        if (remainingUserKeys.length > 0) {
          console.log('❌ REGRESSION: Session keys not cleared by admin deletion');
          console.log('Remaining keys:', remainingUserKeys);
        }
      }
      
    } else {
      console.log('❌ Admin deletion failed:', response.status, await response.text());
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

// Run test
testAdminDeletion();