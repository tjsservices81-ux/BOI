// Clear potentially corrupted localStorage data
export const clearCorruptedStorage = () => {
  try {
    // Clear all banking-related localStorage that might have malformed JSON
    const keysToCheck = [
      'bankUsers',
      'bankAccounts', 
      'bankTransactions',
      'savedPayees',
      'currentUser',
      'lastActiveUser'
    ];
    
    keysToCheck.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          JSON.parse(stored); // Test if it's valid JSON
        }
      } catch (error) {
        console.log(`Removing corrupted localStorage key: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Also check user-specific keys
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('user_')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            JSON.parse(stored);
          }
        } catch (error) {
          console.log(`Removing corrupted user data: ${key}`);
          localStorage.removeItem(key);
        }
      }
    });
    
  } catch (error) {
    console.log('Error clearing storage:', error);
  }
};