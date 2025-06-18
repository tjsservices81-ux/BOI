// Device-exclusive authentication system
// Permanently locks each account to the first device they log in from

interface UserDeviceSession {
  userId: number;
  deviceSessionId: string;
  deviceModel: string;
  ipAddress: string;
  loginTime: string;
  userAgent: string;
  permanentLock: boolean; // Account is permanently locked to this device
}

// In-memory storage for user-device mappings
let userDeviceSessions: Map<number, UserDeviceSession> = new Map();

export function isAccountActiveOnOtherDevice(userId: number, currentDeviceSessionId?: string): boolean {
  const existingSession = userDeviceSessions.get(userId);
  
  if (!existingSession) {
    return false; // No existing session for this user
  }
  
  // Account is permanently locked to first device - ALWAYS block other devices
  return true;
}

export function isCurrentDeviceAuthorized(userId: number, currentUserAgent: string): boolean {
  const existingSession = userDeviceSessions.get(userId);
  
  if (!existingSession) {
    return true; // First time login - allow and lock to this device
  }
  
  // Check if this is the same device by comparing user agent
  return existingSession.userAgent === currentUserAgent;
}

export function setUserDeviceSession(userSession: UserDeviceSession): void {
  userDeviceSessions.set(userSession.userId, userSession);
  console.log(`🔒 PERMANENT DEVICE LOCK: User ${userSession.userId} permanently locked to device ${userSession.deviceModel} (${userSession.deviceSessionId})`);
}

export function removeUserDeviceSession(userId: number): void {
  // Only remove device session on explicit manual logout - not on session errors
  // Device locks remain permanent but session can be cleared for manual logout
  const session = userDeviceSessions.get(userId);
  if (session) {
    console.log(`🔓 MANUAL LOGOUT: User ${userId} manually logged out from ${session.deviceModel}`);
    // Keep device lock but clear active session for clean logout
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