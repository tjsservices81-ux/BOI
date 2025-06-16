import { getAllApprovedIPs } from './ipControl';

interface DeviceSession {
  sessionId: string;
  deviceModel: string;
  ipAddress: string;
  loginTime: string;
  blocked: boolean;
  ipRevoked?: boolean;
  userAgent?: string;
  panicMode?: boolean;
  customerNumber?: string;
}

// In-memory storage for device sessions
let deviceSessions: DeviceSession[] = [];
let blockedDevices: Set<string> = new Set();
let devicePanicMode: Set<string> = new Set();
let customerPanicMode: Set<string> = new Set();

// Generate sample device sessions for demo
function initializeSampleSessions() {
  if (deviceSessions.length === 0) {
    const sampleSessions: DeviceSession[] = [
      {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 15),
        deviceModel: 'iPhone 15 Pro',
        ipAddress: '192.168.1.100',
        loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        blocked: false,
        ipRevoked: false,
        panicMode: false,
        customerNumber: 'BOI050171232',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      },
      {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 15),
        deviceModel: 'Samsung Galaxy S24',
        ipAddress: '192.168.1.101',
        loginTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        blocked: false,
        ipRevoked: false,
        panicMode: false,
        customerNumber: '12345678',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B)'
      },
      {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 15),
        deviceModel: 'iPad Air',
        ipAddress: '192.168.1.102',
        loginTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        blocked: false,
        ipRevoked: false,
        panicMode: false,
        customerNumber: 'BOI911163841',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'
      }
    ];
    
    deviceSessions = sampleSessions;
  }
}

function isIPApproved(ip: string): boolean {
  const approvedIPs = getAllApprovedIPs();
  return approvedIPs.includes(ip);
}

export function getAllDeviceSessions(): DeviceSession[] {
  initializeSampleSessions();
  return deviceSessions.map(session => ({
    ...session,
    blocked: blockedDevices.has(session.sessionId),
    ipRevoked: !isIPApproved(session.ipAddress),
    panicMode: devicePanicMode.has(session.sessionId)
  }));
}

export function blockDevice(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    blockedDevices.add(sessionId);
    return true;
  }
  return false;
}

export function unblockDevice(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    blockedDevices.delete(sessionId);
    return true;
  }
  return false;
}

export function isDeviceBlocked(sessionId: string): boolean {
  return blockedDevices.has(sessionId);
}

export function addDeviceSession(session: Omit<DeviceSession, 'sessionId' | 'loginTime' | 'blocked' | 'ipRevoked'>): string {
  const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
  const newSession: DeviceSession = {
    ...session,
    sessionId,
    loginTime: new Date().toISOString(),
    blocked: false,
    ipRevoked: false
  };
  
  deviceSessions.push(newSession);
  return sessionId;
}

export function removeDeviceSession(sessionId: string): boolean {
  const index = deviceSessions.findIndex(s => s.sessionId === sessionId);
  if (index !== -1) {
    deviceSessions.splice(index, 1);
    blockedDevices.delete(sessionId);
    devicePanicMode.delete(sessionId);
    return true;
  }
  return false;
}

export function activateDevicePanicMode(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    devicePanicMode.add(sessionId);
    if (session.customerNumber) {
      customerPanicMode.add(session.customerNumber);
    }
    console.log(`🚨 DEVICE PANIC MODE ACTIVATED: ${session.deviceModel} (${sessionId}) for customer ${session.customerNumber} at ${new Date().toISOString()}`);
    return true;
  }
  return false;
}

export function deactivateDevicePanicMode(sessionId: string): boolean {
  const session = deviceSessions.find(s => s.sessionId === sessionId);
  if (session) {
    devicePanicMode.delete(sessionId);
    if (session.customerNumber) {
      customerPanicMode.delete(session.customerNumber);
    }
    console.log(`✅ DEVICE PANIC MODE DEACTIVATED: ${session.deviceModel} (${sessionId}) for customer ${session.customerNumber} at ${new Date().toISOString()}`);
    return true;
  }
  return false;
}

export function isDeviceInPanicMode(sessionId: string): boolean {
  return devicePanicMode.has(sessionId);
}

export function isCustomerInPanicMode(customerNumber: string): boolean {
  return customerPanicMode.has(customerNumber);
}