// In-memory user disable management
let disabledUsers: Set<number> = new Set();

export function setUserDisabled(userId: number, disabled: boolean): void {
  if (disabled) {
    disabledUsers.add(userId);
    console.log(`🚫 USER DISABLED: User ID ${userId} has been disabled by admin at ${new Date().toISOString()}`);
  } else {
    disabledUsers.delete(userId);
    console.log(`✅ USER ENABLED: User ID ${userId} has been enabled by admin at ${new Date().toISOString()}`);
  }
}

export function isUserDisabled(userId: number): boolean {
  return disabledUsers.has(userId);
}

export function getDisabledUsers(): number[] {
  return Array.from(disabledUsers);
}

// Check if user is disabled by customer number
export function isCustomerDisabled(customerNumber: string, storage: any): boolean {
  // This would need to find user by customer number and check if disabled
  // For now, return false until we have proper user lookup
  return false;
}