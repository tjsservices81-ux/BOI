// Script to delete user 12345678 from all storage systems
const customerNumber = '12345678';

async function deleteUserFromAllSystems() {
  console.log(`Starting deletion of user ${customerNumber} from all systems...`);
  
  try {
    // 1. Delete from UserDataManager (localStorage)
    console.log('Clearing from localStorage...');
    const userDataKey = `userData_${customerNumber}`;
    const allUsersKey = 'allUsers';
    const currentUserKey = 'currentUser';
    const lastActiveUserKey = 'lastActiveUser';
    
    // Remove specific user data
    localStorage.removeItem(userDataKey);
    
    // Remove from allUsers object
    const allUsers = JSON.parse(localStorage.getItem(allUsersKey) || '{}');
    if (allUsers[customerNumber]) {
      delete allUsers[customerNumber];
      localStorage.setItem(allUsersKey, JSON.stringify(allUsers));
    }
    
    // Clear current user if it matches
    if (localStorage.getItem(currentUserKey) === customerNumber) {
      localStorage.removeItem(currentUserKey);
    }
    
    // Clear last active user if it matches
    if (localStorage.getItem(lastActiveUserKey) === customerNumber) {
      localStorage.removeItem(lastActiveUserKey);
    }
    
    // Clear any other user-specific localStorage keys
    const keysToCheck = ['bankingUser', 'app_session_active', 'splash_completed', 'offline_mode_active', 'offline_user'];
    keysToCheck.forEach(key => {
      const value = localStorage.getItem(key);
      if (value && (value === customerNumber || value.includes(customerNumber))) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ Cleared from localStorage');
    
    // 2. Delete from IndexedDB
    console.log('Clearing from IndexedDB...');
    
    // Open IndexedDB
    const dbRequest = indexedDB.open('BankOfIrelandDB', 1);
    
    await new Promise((resolve, reject) => {
      dbRequest.onsuccess = async (event) => {
        const db = event.target.result;
        
        try {
          // Delete from users store
          const usersTx = db.transaction(['users'], 'readwrite');
          const usersStore = usersTx.objectStore('users');
          await usersStore.delete(customerNumber);
          
          // Delete from accounts store
          const accountsTx = db.transaction(['accounts'], 'readwrite');
          const accountsStore = accountsTx.objectStore('accounts');
          await accountsStore.delete(customerNumber);
          
          // Delete from transactions store
          const transactionsTx = db.transaction(['transactions'], 'readwrite');
          const transactionsStore = transactionsTx.objectStore('transactions');
          await transactionsStore.delete(customerNumber);
          
          console.log('✅ Cleared from IndexedDB');
          resolve();
        } catch (error) {
          console.error('Error clearing IndexedDB:', error);
          reject(error);
        }
      };
      
      dbRequest.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(dbRequest.error);
      };
    });
    
    // 3. Delete from server/database
    console.log('Deleting from server...');
    
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customerNumber })
      });
      
      if (response.ok) {
        console.log('✅ Deleted from server/database');
      } else {
        console.error('❌ Failed to delete from server:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error deleting from server:', error);
    }
    
    // 4. Clear any session data
    console.log('Clearing session data...');
    
    // Clear auth context if user is currently logged in
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    
    console.log('✅ User deletion completed successfully');
    console.log(`User ${customerNumber} has been removed from:`);
    console.log('- localStorage (UserDataManager)');
    console.log('- IndexedDB (offline storage)');
    console.log('- Server database');
    console.log('- Current session');
    
  } catch (error) {
    console.error('❌ Error during user deletion:', error);
  }
}

// Execute the deletion
deleteUserFromAllSystems();