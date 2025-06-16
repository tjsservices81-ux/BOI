// Device-exclusive authentication system
// Ensures each account can only be active on one device at a time

interface UserDeviceSession {
  userId: number;
  deviceSessionId: string;
  deviceModel: string;
  ipAddress: string;
  loginTime: string;
  userAgent: string;
}

// In-memory storage for user-device mappings
let userDeviceSessions: Map<number, UserDeviceSession> = new Map();

export function isAccountActiveOnOtherDevice(userId: number, currentDeviceSessionId?: string): boolean {
  const existingSession = userDeviceSessions.get(userId);
  
  if (!existingSession) {
    return false; // No existing session for this user
  }
  
  // If no current device session provided, just check if any session exists
  if (!currentDeviceSessionId || currentDeviceSessionId === 'temp') {
    return true; // Account is active on another device
  }
  
  // Check if the existing session is different from current device
  return existingSession.deviceSessionId !== currentDeviceSessionId;
}

export function setUserDeviceSession(userSession: UserDeviceSession): void {
  userDeviceSessions.set(userSession.userId, userSession);
  console.log(`🔒 USER DEVICE LOCKED: User ${userSession.userId} locked to device ${userSession.deviceModel} (${userSession.deviceSessionId})`);
}

export function removeUserDeviceSession(userId: number): void {
  if (userDeviceSessions.has(userId)) {
    const session = userDeviceSessions.get(userId);
    userDeviceSessions.delete(userId);
    console.log(`🔓 USER DEVICE UNLOCKED: User ${userId} unlocked from device ${session?.deviceModel}`);
  }
}

export function getUserDeviceSession(userId: number): UserDeviceSession | undefined {
  return userDeviceSessions.get(userId);
}

export function getAllUserDeviceSessions(): UserDeviceSession[] {
  return Array.from(userDeviceSessions.values());
}

// For admin panel - force logout user from their device
export function forceLogoutUser(userId: number): boolean {
  const session = userDeviceSessions.get(userId);
  if (session) {
    removeUserDeviceSession(userId);
    console.log(`👮 ADMIN FORCE LOGOUT: User ${userId} forcibly logged out from ${session.deviceModel}`);
    return true;
  }
  return false;
}