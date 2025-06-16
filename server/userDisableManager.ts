// In-memory user disable management
let disabledUsers: Set<number> = new Set();

export function setUserDisabled(userId: number, disabled: boolean): void {
  if (disabled) {
    disabledUsers.add(userId);
  } else {
    disabledUsers.delete(userId);
  }
}

export function isUserDisabled(userId: number): boolean {
  return disabledUsers.has(userId);
}

export function getDisabledUsers(): number[] {
  return Array.from(disabledUsers);
}