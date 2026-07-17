// Device-exclusive authentication system
// Locks each account to the first device they log in from, while tolerating
// User-Agent changes on that SAME physical device (browser/OS updates, or an
// iPad reporting itself as "Macintosh").

interface UserDeviceSession {
  userId: number;
  deviceSessionId: string;
  deviceModel: string;
  ipAddress: string;
  loginTime: string;
  userAgent: string;
  isTouchDevice: boolean; // navigator.maxTouchPoints > 0 at login
  permanentLock: boolean; // Account is permanently locked to this device
}

// In-memory storage for user-device mappings
let userDeviceSessions: Map<number, UserDeviceSession> = new Map();

// Broad device "family" - deliberately coarse so browser/OS version bumps
// never change the classification for the same physical hardware.
type DeviceFamily = 'iOS' | 'Android' | 'Windows' | 'Mac' | 'Other';

function getDeviceFamily(userAgent: string, isTouchDevice: boolean): DeviceFamily {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Android/i.test(userAgent)) return 'Android';
  // iPadOS 13+ requests the desktop site by default, so it reports a
  // "Macintosh" UA indistinguishable from a real Mac - except it's touch
  // capable. Treat any touch-capable "Mac" UA as an iPad (iOS family).
  if (/Macintosh|Mac OS X/i.test(userAgent) && isTouchDevice) return 'iOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'Mac';
  return 'Other';
}

export function isAccountActiveOnOtherDevice(userId: number, currentDeviceSessionId?: string): boolean {
  const existingSession = userDeviceSessions.get(userId);

  if (!existingSession) {
    return false; // No existing session for this user
  }

  // Account is permanently locked to first device - ALWAYS block other devices
  return true;
}

export function isCurrentDeviceAuthorized(userId: number, currentUserAgent: string, isTouchDevice = false): boolean {
  const existingSession = userDeviceSessions.get(userId);

  if (!existingSession) {
    return true; // First time login - allow and lock to this device
  }

  // Exact match (same browser, nothing changed) - always allow.
  if (existingSession.userAgent === currentUserAgent) {
    return true;
  }

  // Same physical device family - allow even if the UA string itself changed
  // (browser update, iOS/iPadOS update, or an iPad now reporting as "Mac").
  const currentFamily = getDeviceFamily(currentUserAgent, isTouchDevice);
  const existingFamily = getDeviceFamily(existingSession.userAgent, existingSession.isTouchDevice);

  if (currentFamily === existingFamily) {
    console.log(`✅ SAME DEVICE FAMILY (${currentFamily}): Allowing login for user ${userId} despite UA change`);
    return true;
  }

  // Genuinely different device family - block.
  console.log(`🚫 DIFFERENT DEVICE: User ${userId} trying ${currentFamily} but locked to ${existingFamily}`);
  return false;
}

export function setUserDeviceSession(userSession: UserDeviceSession): void {
  userDeviceSessions.set(userSession.userId, userSession);
  console.log(`🔒 DEVICE LOCK: User ${userSession.userId} locked to device ${userSession.deviceModel} (${userSession.deviceSessionId})`);
}

export function removeUserDeviceSession(userId: number): boolean {
  const existed = userDeviceSessions.delete(userId);
  if (existed) {
    console.log(`🔓 DEVICE LOCK CLEARED: User ${userId} device lock removed`);
  }
  return existed;
}

export function getUserDeviceSession(userId: number): UserDeviceSession | undefined {
  return userDeviceSessions.get(userId);
}

export function getAllUserDeviceSessions(): UserDeviceSession[] {
  return Array.from(userDeviceSessions.values());
}

// For admin panel - force logout user from their device and clear the lock
export function forceLogoutUser(userId: number): boolean {
  const session = userDeviceSessions.get(userId);
  if (session) {
    removeUserDeviceSession(userId);
    console.log(`👮 ADMIN FORCE LOGOUT: User ${userId} forcibly logged out from ${session.deviceModel}`);
    return true;
  }
  return false;
}
