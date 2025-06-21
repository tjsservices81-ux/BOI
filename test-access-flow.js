// Clear localStorage and test fresh access flow
console.log('Clearing localStorage and testing access flow...');

// Clear any stored access
localStorage.removeItem('accessGranted');
localStorage.removeItem('accessCode');
localStorage.removeItem('lastSessionActivity');
localStorage.removeItem('bankingUser');
localStorage.removeItem('bankingUserBackup');

console.log('Storage cleared. Reloading page...');

// Redirect to fresh URL with access code
window.location.href = '/?access=BOI729889';