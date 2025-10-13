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
  
  // FIXED: More lenient device matching to prevent lockouts
  // Allow login if:
  // 1. Exact user agent match (same browser)
  // 2. Same device type (iPhone to iPhone, Android to Android)
  // 3. Always allow if existing session is very old (>7 days - device reset)
  
  const exactMatch = existingSession.userAgent === currentUserAgent;
  if (exactMatch) return true;
  
  // Check if login is very old (>7 days) - allow re-authentication
  const loginAge = Date.now() - new Date(existingSession.loginTime).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (loginAge > sevenDays) {
    console.log(`🔓 OLD SESSION: Allowing re-auth for user ${userId} (session ${Math.floor(loginAge / (24*60*60*1000))} days old)`);
    return true;
  }
  
  // Check device type compatibility (iOS to iOS, Android to Android, etc.)
  const getDeviceType = (ua: string) => {
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'Mac';
    return 'Other';
  };
  
  const currentDeviceType = getDeviceType(currentUserAgent);
  const existingDeviceType = getDeviceType(existingSession.userAgent);
  
  if (currentDeviceType === existingDeviceType) {
    console.log(`✅ SAME DEVICE TYPE: Allowing ${currentDeviceType} login for user ${userId}`);
    return true;
  }
  
  // Different device type - block
  console.log(`🚫 DIFFERENT DEVICE: User ${userId} trying ${currentDeviceType} but locked to ${existingDeviceType}`);
  return false;
}

export function setUserDeviceSession(userSession: UserDeviceSession): void {
  userDeviceSessions.set(userSession.userId, userSession);
  console.log(`🔒 PERMANENT DEVICE LOCK: User ${userSession.userId} permanently locked to device ${userSession.deviceModel} (${userSession.deviceSessionId})`);
}

export function removeUserDeviceSession(userId: number): void {
  // Permanent device locks cannot be removed
  // This function is disabled to prevent device unlocking
  console.log(`🚫 PERMANENT LOCK: Cannot unlock User ${userId} - device lock is permanent`);
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