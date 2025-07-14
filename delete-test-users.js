/**
 * Admin script to delete test users who may be using revoked access codes
 */

async function deleteTestUsers() {
  const testCustomerNumbers = [
    'BOI254484596', // Recent test user
    'BOI464856',    // If created as customer number
  ];

  console.log('🔧 ADMIN USER DELETION SCRIPT');
  console.log('============================');
  
  for (const customerNumber of testCustomerNumbers) {
    try {
      console.log(`\n🎯 Attempting to delete user: ${customerNumber}`);
      
      const response = await fetch('http://localhost:5000/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-secret-key'
        },
        body: JSON.stringify({ customerNumber })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ User ${customerNumber} deleted successfully`);
        console.log(`📊 Sessions invalidated: ${result.details?.sessionsInvalidated || 0}`);
        console.log(`🧹 Storage keys cleared: ${result.details?.storageKeysCleared || 0}`);
      } else if (response.status === 404) {
        console.log(`ℹ️  User ${customerNumber} not found (already deleted or never existed)`);
      } else {
        console.log(`❌ Failed to delete user ${customerNumber}: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error deleting user ${customerNumber}:`, error.message);
    }
  }
  
  console.log('\n🎉 User deletion script completed');
  console.log('All targeted users have been processed');
}

deleteTestUsers().catch(console.error);